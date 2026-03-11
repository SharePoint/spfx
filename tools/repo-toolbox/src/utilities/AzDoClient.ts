// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type * as child_process from 'node:child_process';

import { WebApi, getBearerHandler } from 'azure-devops-node-api';
import type { IBuildApi } from 'azure-devops-node-api/BuildApi';
import type * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import {
  type Artifact as PipelinesArtifact,
  GetArtifactExpandOptions
} from 'azure-devops-node-api/interfaces/PipelinesInterfaces';
import type { IPipelinesApi } from 'azure-devops-node-api/PipelinesApi';

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
  private _pipelinesApi: IPipelinesApi | undefined;

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
   * Uses the Pipelines API with a signed download URL so that `System.AccessToken` is
   * the only credential required.
   */
  public async downloadArtifactAsync(options: IDownloadArtifactOptions): Promise<void> {
    const { buildId, artifactName, targetPath } = options;
    const terminal: ITerminal = this._terminal;

    // Get the pipeline (definition) ID from the build
    const buildApi: IBuildApi = await this._getBuildApiAsync();
    const build: BuildInterfaces.Build = await buildApi.getBuild(this._project, buildId);
    const pipelineId: number | undefined = build.definition?.id;
    if (pipelineId === undefined) {
      throw new Error(`Could not determine pipeline definition ID from build ${buildId}.`);
    }

    terminal.writeLine(`Pipeline definition ID: ${pipelineId}`);

    // Get a signed download URL for the artifact via the Pipelines API
    const pipelinesApi: IPipelinesApi = await this._getPipelinesApiAsync();
    const artifact: PipelinesArtifact = await pipelinesApi.getArtifact(
      this._project,
      pipelineId,
      buildId,
      artifactName,
      GetArtifactExpandOptions.SignedContent
    );

    const downloadUrl: string | undefined = artifact.signedContent?.url;
    if (!downloadUrl) {
      throw new Error(
        `Could not get signed download URL for artifact "${artifactName}" from build ${buildId}.`
      );
    }

    terminal.writeLine(`Downloading artifact "${artifactName}" from build ${buildId}...`);

    const response: Response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download artifact: ${response.status} ${response.statusText}`);
    }

    const buffer: Buffer = Buffer.from(await response.arrayBuffer());

    const zipPath: string = `${targetPath}/_${artifactName}.zip`;
    await FileSystem.writeFileAsync(zipPath, buffer, { ensureFolderExists: true });

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

  private async _getPipelinesApiAsync(): Promise<IPipelinesApi> {
    if (!this._pipelinesApi) {
      this._pipelinesApi = await this._connection.getPipelinesApi();
    }

    return this._pipelinesApi;
  }
}
