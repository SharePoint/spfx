// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { WebApi, getBearerHandler } from 'azure-devops-node-api';
import type { IBuildApi } from 'azure-devops-node-api/BuildApi';

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

export class AzDoClient {
  private readonly _connection: WebApi;
  private readonly _project: string;
  private readonly _terminal: ITerminal;
  private _buildApi: IBuildApi | undefined;

  public constructor(options: IAzDoClientOptions, terminal: ITerminal) {
    const { orgUrl, project, accessToken } = options;
    this._project = project;
    this._terminal = terminal;
    this._connection = new WebApi(orgUrl, getBearerHandler(accessToken));
  }

  /**
   * Downloads a pipeline artifact by build ID and artifact name, then extracts it to
   * the specified target directory.
   *
   * Uses the Build API's {@link IBuildApi.getArtifactContentZip} which returns a
   * readable stream, allowing large artifacts to be written to disk without buffering
   * the entire payload in memory.
   */
  public async downloadArtifactAsync(options: IDownloadArtifactOptions): Promise<void> {
    const { buildId, artifactName, targetPath } = options;
    const terminal: ITerminal = this._terminal;

    terminal.writeLine(`Downloading artifact "${artifactName}" from build ${buildId}...`);

    const buildApi: IBuildApi = await this._getBuildApiAsync();
    const contentStream: NodeJS.ReadableStream = await buildApi.getArtifactContentZip(
      this._project,
      buildId,
      artifactName
    );

    // Stream the zip content directly to disk.
    const zipPath: string = `${targetPath}/_${artifactName}.zip`;
    await FileSystem.ensureFolderAsync(targetPath);

    const writeStream: fs.WriteStream = fs.createWriteStream(zipPath);
    await pipeline(contentStream, writeStream);

    terminal.writeLine(`Downloaded artifact to ${zipPath}`);

    terminal.writeLine(`Extracting artifact to ${targetPath}...`);

    const unzipArgs: string[] = ['-o', '-q', zipPath, '-d', targetPath];

    terminal.writeLine(`> ${UNZIP_BIN_NAME} ${unzipArgs.join(' ')}`);

    // Pipeline artifact downloads are zip archives. The Linux agents used by
    // this pipeline always have "unzip" available.
    const unzipProcess: child_process.ChildProcess = Executable.spawn(UNZIP_BIN_NAME, unzipArgs, {
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

  private async _getBuildApiAsync(): Promise<IBuildApi> {
    if (!this._buildApi) {
      this._buildApi = await this._connection.getBuildApi();
    }

    return this._buildApi;
  }
}
