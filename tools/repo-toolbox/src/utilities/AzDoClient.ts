// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { WebApi, getBearerHandler } from 'azure-devops-node-api';
import type { IBuildApi } from 'azure-devops-node-api/BuildApi';
import type { BuildArtifact } from 'azure-devops-node-api/interfaces/BuildInterfaces';

import { Executable, FileSystem } from '@rushstack/node-core-library';
import type { ITerminal } from '@rushstack/terminal';

export interface IAzDoClientOptions {
  orgUrl: string;
  project: string;
  accessToken: string;
}

export interface IDownloadArtifactOptions {
  buildId: number;
  artifactName: string;
  targetPath: string;
}

const UNZIP_BIN_NAME: 'unzip' = 'unzip';

/** Report download progress to the terminal at this interval. */
const PROGRESS_LOG_INTERVAL_BYTES: number = 10 * 1024 * 1024; // 10 MB

export class AzDoClient {
  private readonly _connection: WebApi;
  private readonly _project: string;
  private readonly _terminal: ITerminal;
  private readonly _accessToken: string;
  private _buildApi: IBuildApi | undefined;

  public constructor(options: IAzDoClientOptions, terminal: ITerminal) {
    const { orgUrl, project, accessToken } = options;
    this._project = project;
    this._terminal = terminal;
    this._accessToken = accessToken;
    this._connection = new WebApi(orgUrl, getBearerHandler(accessToken));
  }

  /**
   * Downloads a pipeline artifact by build ID and artifact name, then extracts it to
   * the specified target directory.
   *
   * Retrieves the artifact metadata via the Build API to obtain a download URL,
   * then streams the zip content to disk before extracting. This approach works with
   * both legacy build artifacts (Container) and modern pipeline artifacts
   * (PipelineArtifact).
   *
   * @remarks
   * The previous implementation used {@link IBuildApi.getArtifactContentZip} which only
   * works for legacy build artifacts published via `PublishBuildArtifacts`. For pipeline
   * artifacts published via `PublishPipelineArtifact` (including 1ES template outputs),
   * that endpoint returns empty or invalid content, causing `unzip` to fail with exit
   * code 9 ("specified zipfiles were not found").
   */
  public async downloadArtifactAsync(options: IDownloadArtifactOptions): Promise<void> {
    const { buildId, artifactName, targetPath } = options;
    const terminal: ITerminal = this._terminal;

    terminal.writeLine(`Downloading artifact "${artifactName}" from build ${buildId}...`);

    // Retrieve artifact metadata so we get the correct download URL for the
    // artifact type (Container or PipelineArtifact).
    terminal.writeLine(`Querying artifact metadata from Build API...`);
    const buildApi: IBuildApi = await this._getBuildApiAsync();

    let artifact: BuildArtifact;
    try {
      artifact = await buildApi.getArtifact(this._project, buildId, artifactName);
    } catch (error) {
      throw new Error(
        `Failed to retrieve metadata for artifact "${artifactName}" from build ${buildId}. ` +
          `Verify the artifact name and build ID are correct. API error: ${error}`
      );
    }

    const resourceType: string = artifact.resource?.type ?? 'unknown';
    const downloadUrl: string | undefined = artifact.resource?.downloadUrl;

    terminal.writeLine(`Artifact "${artifactName}" found (resource type: ${resourceType}).`);

    if (!downloadUrl) {
      throw new Error(
        `Artifact "${artifactName}" from build ${buildId} does not have a download URL ` +
          `(resource type: ${resourceType}). Verify that the artifact was published correctly.`
      );
    }

    terminal.writeLine(`Download URL obtained. Starting download...`);

    const zipPath: string = `${targetPath}/_${artifactName}.zip`;
    await FileSystem.ensureFolderAsync(targetPath);

    // Stream the artifact content to disk.
    await this._downloadToFileAsync(downloadUrl, zipPath);

    terminal.writeLine(`Extracting artifact to ${targetPath}...`);

    const unzipArgs: string[] = ['-o', '-q', zipPath, '-d', targetPath];

    terminal.writeLine(`> ${UNZIP_BIN_NAME} ${unzipArgs.join(' ')}`);

    // Pipeline artifact downloads are zip archives. The Linux agents used by
    // this pipeline always have "unzip" available.
    const unzipProcess: ChildProcess = Executable.spawn(UNZIP_BIN_NAME, unzipArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await Executable.waitForExitAsync(unzipProcess, {
      encoding: 'utf8',
      throwOnNonZeroExitCode: true,
      throwOnSignal: true
    });

    await FileSystem.deleteFileAsync(zipPath);

    terminal.writeLine(`Artifact "${artifactName}" extracted to ${targetPath}.`);
  }

  /**
   * Downloads a file from the given URL with Bearer authentication and writes it to disk.
   *
   * Uses the native `fetch` API (Node 22+), which automatically follows redirects and
   * strips the Authorization header on cross-origin hops per the Fetch spec — preventing
   * credential leakage to third-party hosts (e.g. Azure Blob Storage signed URLs).
   */
  private async _downloadToFileAsync(url: string, filePath: string): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const response: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this._accessToken}`,
        Accept: 'application/octet-stream'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const body: string = await response.text().catch(() => '');
      throw new Error(
        `Artifact download failed with HTTP ${response.status} ${response.statusText}.` +
          (body ? ` Response body (truncated): ${body.slice(0, 500)}` : '')
      );
    }

    terminal.writeLine(`HTTP ${response.status} — streaming response to disk...`);

    const contentLengthHeader: string | null = response.headers.get('content-length');
    const totalBytes: number | undefined = contentLengthHeader
      ? parseInt(contentLengthHeader, 10)
      : undefined;

    if (totalBytes !== undefined) {
      terminal.writeLine(`Content-Length: ${totalBytes}`);
    } else {
      terminal.writeLine(`Content-Length not provided; downloading until stream ends.`);
    }

    if (!response.body) {
      throw new Error('Artifact download response has no body.');
    }

    const bodyStream: Readable = Readable.fromWeb(response.body);

    // Track progress and log periodically during the download.
    let bytesReceived: number = 0;
    let lastLoggedAt: number = 0;

    bodyStream.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived - lastLoggedAt >= PROGRESS_LOG_INTERVAL_BYTES) {
        const progress: string =
          totalBytes !== undefined ? ` (${((bytesReceived / totalBytes) * 100).toFixed(0)}%)` : '';
        terminal.writeLine(`  Downloaded ${bytesReceived}B${progress}...`);
        lastLoggedAt = bytesReceived;
      }
    });

    const writeStream: fs.WriteStream = fs.createWriteStream(filePath);
    await pipeline(bodyStream, writeStream);

    terminal.writeLine(`Download complete: ${bytesReceived}B written to ${filePath}`);
  }

  private async _getBuildApiAsync(): Promise<IBuildApi> {
    if (!this._buildApi) {
      this._buildApi = await this._connection.getBuildApi();
    }

    return this._buildApi;
  }
}
