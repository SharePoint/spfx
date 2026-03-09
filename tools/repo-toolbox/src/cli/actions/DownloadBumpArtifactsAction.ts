// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  type IRequiredCommandLineStringParameter,
  type CommandLineStringListParameter,
  CommandLineAction
} from '@rushstack/ts-command-line';

import { createGitHubClientAsync, execGitAsync } from '../../utilities/GitUtilities';
import type { GitHubClient, ICommitPr } from '../../utilities/GitHubClient';
import { AzDoClient } from '../../utilities/AzDoClient';

export class DownloadBumpArtifactsAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _artifactNamesParameter: CommandLineStringListParameter;
  private readonly _targetPathParameter: IRequiredCommandLineStringParameter;
  private readonly _orgUrlParameter: IRequiredCommandLineStringParameter;
  private readonly _projectParameter: IRequiredCommandLineStringParameter;
  private readonly _accessTokenParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'download-bump-artifacts',
      summary: 'Downloads artifacts from the bump pipeline run that produced the current commit.',
      documentation:
        'Finds the PR for HEAD, extracts the SourceBuild: label to get the pipeline run ID, ' +
        'then downloads the specified artifacts via the Azure DevOps Pipelines API.'
    });

    this._terminal = terminal;

    this._artifactNamesParameter = this.defineStringListParameter({
      parameterLongName: '--artifact-name',
      argumentName: 'NAME',
      description: 'Artifact name to download (can be specified multiple times)'
    });

    this._targetPathParameter = this.defineStringParameter({
      parameterLongName: '--target-path',
      argumentName: 'PATH',
      description: 'Target directory for downloaded artifacts (each artifact is placed in a subdirectory)',
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

    // --- Resolve the bump pipeline run ID from the GitHub PR label ---

    const commitSha: string = await execGitAsync(['rev-parse', 'HEAD']);
    terminal.writeLine(`Merge commit SHA: ${commitSha}`);

    const gitHubClient: GitHubClient = await createGitHubClientAsync();

    const pr: ICommitPr | undefined = await gitHubClient.getPrForCommitAsync(commitSha);
    if (!pr) {
      throw new Error(`Could not find a PR associated with commit ${commitSha}.`);
    }
    terminal.writeLine(`Found PR #${pr.number}`);

    const sourceBuildLabel: { name?: string } | undefined = pr.labels.find((l: { name?: string }) =>
      l.name?.startsWith('SourceBuild:')
    );
    if (!sourceBuildLabel?.name) {
      throw new Error(`PR #${pr.number} does not have a SourceBuild: label.`);
    }

    const buildIdString: string | undefined = sourceBuildLabel.name.split(':')[1];
    const buildId: number = parseInt(buildIdString ?? '', 10);
    if (isNaN(buildId)) {
      throw new Error(`Could not parse build ID from label: ${sourceBuildLabel.name}`);
    }
    terminal.writeLine(`Bump pipeline run ID: ${buildId}`);

    // --- Download artifacts via AzDO API ---

    const orgUrl: string = this._orgUrlParameter.value;
    const project: string = this._projectParameter.value;
    const accessToken: string = this._accessTokenParameter.value;

    const azDoClient: AzDoClient = new AzDoClient({ orgUrl, project, accessToken }, terminal);

    const artifactNames: readonly string[] = this._artifactNamesParameter.values;
    if (artifactNames.length === 0) {
      throw new Error('At least one --artifact-name must be specified.');
    }

    const targetPath: string = this._targetPathParameter.value;

    for (const artifactName of artifactNames) {
      await azDoClient.downloadArtifactAsync({
        buildId,
        artifactName,
        targetPath: `${targetPath}/${artifactName}`
      });
    }

    terminal.writeLine('All artifacts downloaded successfully.');
  }
}
