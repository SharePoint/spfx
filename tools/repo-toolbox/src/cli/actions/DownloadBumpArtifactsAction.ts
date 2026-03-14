// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  type IRequiredCommandLineStringParameter,
  type CommandLineStringListParameter,
  type IRequiredCommandLineIntegerParameter,
  CommandLineAction
} from '@rushstack/ts-command-line';

import { AzDoClient } from '../../utilities/AzDoClient';

export class DownloadBumpArtifactsAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _buildIdParameter: IRequiredCommandLineIntegerParameter;
  private readonly _artifactNamesParameter: CommandLineStringListParameter;
  private readonly _targetPathParameter: IRequiredCommandLineStringParameter;
  private readonly _orgUrlParameter: IRequiredCommandLineStringParameter;
  private readonly _projectParameter: IRequiredCommandLineStringParameter;
  private readonly _accessTokenParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'download-bump-artifacts',
      summary: 'Downloads artifacts from the specified pipeline run.',
      documentation:
        'Downloads the specified artifacts from the given Azure DevOps pipeline run via the Pipelines API.'
    });

    this._terminal = terminal;

    this._buildIdParameter = this.defineIntegerParameter({
      parameterLongName: '--build-id',
      argumentName: 'ID',
      description: 'The pipeline run (build) ID to download artifacts from',
      required: true
    });

    this._artifactNamesParameter = this.defineStringListParameter({
      parameterLongName: '--artifact-name',
      argumentName: 'NAME',
      description: 'Artifact name to download (can be specified multiple times)'
    });

    this._targetPathParameter = this.defineStringParameter({
      parameterLongName: '--target-path',
      argumentName: 'PATH',
      description:
        'Target directory for downloaded artifacts. Each artifact zip is extracted here; ' +
        'the zip root folder (named after the artifact) becomes a subdirectory of this path.',
      required: true
    });

    this._orgUrlParameter = this.defineStringParameter({
      parameterLongName: '--org-url',
      argumentName: 'URL',
      description: 'Azure DevOps organization URL',
      required: true,
      environmentVariable: 'SYSTEM_COLLECTIONURI'
    });

    this._projectParameter = this.defineStringParameter({
      parameterLongName: '--project',
      argumentName: 'PROJECT',
      description: 'Azure DevOps project name',
      required: true,
      environmentVariable: 'SYSTEM_TEAMPROJECT'
    });

    this._accessTokenParameter = this.defineStringParameter({
      parameterLongName: '--access-token',
      argumentName: 'TOKEN',
      description: 'Azure DevOps access token',
      required: true,
      environmentVariable: 'SYSTEM_ACCESSTOKEN'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const buildId: number = this._buildIdParameter.value;
    terminal.writeLine(`Pipeline run ID: ${buildId}`);

    const artifactNames: readonly string[] = this._artifactNamesParameter.values;
    if (artifactNames.length === 0) {
      throw new Error('At least one --artifact-name must be specified.');
    }

    terminal.writeLine(`Artifacts to download: ${artifactNames.join(', ')}`);

    const orgUrl: string = this._orgUrlParameter.value;
    const project: string = this._projectParameter.value;
    const accessToken: string = this._accessTokenParameter.value;

    terminal.writeLine(`AzDO organization: ${orgUrl}`);
    terminal.writeLine(`AzDO project: ${project}`);

    const azDoClient: AzDoClient = new AzDoClient({ orgUrl, project, accessToken }, terminal);

    const targetPath: string = this._targetPathParameter.value;
    terminal.writeLine(`Target path: ${targetPath}`);
    terminal.writeLine('');

    for (const artifactName of artifactNames) {
      terminal.writeLine(`--- Downloading artifact: ${artifactName} ---`);
      await azDoClient.downloadArtifactAsync({
        buildId,
        artifactName,
        targetPath
      });
      terminal.writeLine('');
    }

    terminal.writeLine(`All ${artifactNames.length} artifact(s) downloaded successfully.`);
    terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
  }
}
