// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
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

/** Maximum number of HTTP redirects to follow before aborting. */
const MAX_REDIRECTS: number = 5;

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
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to retrieve metadata for artifact "${artifactName}" from build ${buildId}. ` +
          `Verify the artifact name and build ID are correct. API error: ${message}`
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

    // Stream the artifact content to disk, following redirects as needed.
    await this._downloadToFileAsync(downloadUrl, zipPath);

    // Sanity-check: make sure the file is a valid zip archive before invoking unzip.
    // This produces a clear error message instead of the opaque "exit code 9".
    await AzDoClient._validateZipFileAsync(zipPath, terminal);

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
   * Redirects are followed automatically; the Authorization header is intentionally stripped
   * on redirect hops to avoid leaking credentials to third-party hosts (e.g. Azure Blob
   * Storage signed URLs).
   */
  private async _downloadToFileAsync(url: string, filePath: string): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const response: http.IncomingMessage = await this._getWithRedirectsAsync(url);

    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
      // Attempt to read the response body for diagnostics.
      let body: string = '';
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of response) {
          chunks.push(chunk as Buffer);
          if (chunks.length > 10) break; // Limit how much we read
        }
        body = Buffer.concat(chunks).toString('utf8').slice(0, 500);
      } catch {
        // Ignore errors reading the error body.
      }
      throw new Error(
        `Artifact download failed with HTTP ${response.statusCode} ${response.statusMessage}.` +
          (body ? ` Response body (truncated): ${body}` : '')
      );
    }

    terminal.writeLine(`HTTP ${response.statusCode} — streaming response to disk...`);

    const contentLengthHeader: string | undefined = response.headers['content-length'];
    const totalBytes: number | undefined = contentLengthHeader
      ? parseInt(contentLengthHeader, 10)
      : undefined;

    if (totalBytes !== undefined) {
      terminal.writeLine(`Content-Length: ${AzDoClient._formatBytes(totalBytes)}`);
    } else {
      terminal.writeLine(`Content-Length not provided; downloading until stream ends.`);
    }

    // Track progress and log periodically during the download.
    let bytesReceived: number = 0;
    let lastLoggedAt: number = 0;

    response.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived - lastLoggedAt >= PROGRESS_LOG_INTERVAL_BYTES) {
        const progress: string =
          totalBytes !== undefined ? ` (${((bytesReceived / totalBytes) * 100).toFixed(0)}%)` : '';
        terminal.writeLine(`  Downloaded ${AzDoClient._formatBytes(bytesReceived)}${progress}...`);
        lastLoggedAt = bytesReceived;
      }
    });

    const writeStream: fs.WriteStream = fs.createWriteStream(filePath);
    await pipeline(response, writeStream);

    terminal.writeLine(`Download complete: ${AzDoClient._formatBytes(bytesReceived)} written to ${filePath}`);
  }

  /**
   * Performs an HTTPS GET request, following up to {@link MAX_REDIRECTS} redirects.
   *
   * The `Authorization` header is included on the initial request to the Azure DevOps
   * API but is intentionally omitted on subsequent redirect hops (which typically
   * target pre-signed Azure Blob Storage URLs).
   */
  private async _getWithRedirectsAsync(url: string): Promise<http.IncomingMessage> {
    const terminal: ITerminal = this._terminal;
    let currentUrl: string = url;
    let includeAuth: boolean = true;

    for (let attempt: number = 0; attempt <= MAX_REDIRECTS; attempt++) {
      const response: http.IncomingMessage = await this._httpGetAsync(currentUrl, includeAuth);

      const statusCode: number | undefined = response.statusCode;
      if ((statusCode === 301 || statusCode === 302 || statusCode === 307) && response.headers.location) {
        // Consume the redirect body so the socket is released.
        response.resume();
        terminal.writeLine(`  HTTP ${statusCode} redirect → following Location header...`);
        currentUrl = response.headers.location;
        // Do not forward credentials to redirect targets.
        includeAuth = false;
        continue;
      }

      return response;
    }

    throw new Error(`Too many redirects (>${MAX_REDIRECTS}) while downloading from: ${url}`);
  }

  /**
   * Issues a single HTTP(S) GET and returns the response.
   */
  private _httpGetAsync(url: string, includeAuth: boolean): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
      const headers: Record<string, string> = {
        Accept: 'application/octet-stream'
      };
      if (includeAuth) {
        headers['Authorization'] = `Bearer ${this._accessToken}`; // eslint-disable-line dot-notation
      }

      const parsedUrl: URL = new URL(url);
      const transport: typeof https | typeof http = parsedUrl.protocol === 'https:' ? https : http;

      const request: http.ClientRequest = transport.get(url, { headers }, resolve);
      request.on('error', reject);
    });
  }

  /**
   * Verifies that the file at {@link zipPath} begins with the ZIP local file header
   * signature (`PK\x03\x04`). Throws a descriptive error if the file is empty or not
   * a valid zip archive—this catches issues such as the server returning an HTML error
   * page instead of artifact content.
   */
  private static async _validateZipFileAsync(zipPath: string, terminal: ITerminal): Promise<void> {
    const stats: fs.Stats = await fs.promises.stat(zipPath);

    terminal.writeLine(`Validating downloaded file: ${zipPath} (${AzDoClient._formatBytes(stats.size)})`);

    if (stats.size === 0) {
      throw new Error(
        `Downloaded artifact file is empty (0 bytes): ${zipPath}. ` +
          `The artifact may not exist or the download URL may have expired.`
      );
    }

    // ZIP files start with the local file header signature: 0x504B0304 ("PK\x03\x04").
    const ZIP_MAGIC: Buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const fd: fs.promises.FileHandle = await fs.promises.open(zipPath, 'r');
    try {
      const header: Buffer = Buffer.alloc(4);
      await fd.read(header, 0, 4, 0);

      if (!header.subarray(0, 4).equals(ZIP_MAGIC)) {
        throw new Error(
          `Downloaded file is not a valid ZIP archive: ${zipPath}. ` +
            `Expected ZIP magic bytes (504b0304) but got: ${header.toString('hex')}. ` +
            `The server may have returned an error page instead of artifact content.`
        );
      }
    } finally {
      await fd.close();
    }

    terminal.writeLine(`ZIP file validated successfully.`);
  }

  private static _formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }
    const mb: number = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  private async _getBuildApiAsync(): Promise<IBuildApi> {
    if (!this._buildApi) {
      this._buildApi = await this._connection.getBuildApi();
    }

    return this._buildApi;
  }
}
