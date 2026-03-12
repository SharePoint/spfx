// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  type IRequiredCommandLineStringParameter,
  type CommandLineStringListParameter,
  CommandLineAction
} from '@rushstack/ts-command-line';

import { GitHubClient, type ICommitPr } from '../../utilities/GitHubClient';
import { AzDoClient } from '../../utilities/AzDoClient';

export class DownloadBumpArtifactsAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;
  private readonly _artifactNamesParameter: CommandLineStringListParameter;
  private readonly _targetPathParameter: IRequiredCommandLineStringParameter;
  private readonly _orgUrlParameter: IRequiredCommandLineStringParameter;
  private readonly _projectParameter: IRequiredCommandLineStringParameter;
  private readonly _accessTokenParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'download-bump-artifacts',
      summary:
        'If the current commit is a version bump merge, downloads artifacts from the originating bump pipeline run.',
      documentation:
        'Looks up the PR associated with the specified commit SHA. If a SourceBuild: label is found, ' +
        'downloads the specified artifacts from that pipeline run via the Azure DevOps Pipelines API. ' +
        'Sets the AzDO output variable IsVersionBumpMerge to true or false.'
    });

    this._terminal = terminal;

    this._commitShaParameter = this.defineStringParameter({
      parameterLongName: '--commit-sha',
      argumentName: 'SHA',
      description: 'The merge commit SHA to look up',
      required: true,
      environmentVariable: 'BUILD_SOURCEVERSION'
    });

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

    const commitSha: string = this._commitShaParameter.value;
    terminal.writeLine(`Merge commit SHA: ${commitSha}`);

    // --- Check whether this commit is a version bump merge ---

    terminal.writeLine('Looking up associated pull request via GitHub API...');
    const gitHubClient: GitHubClient = await GitHubClient.createGitHubClientAsync(terminal);

    const pr: ICommitPr | undefined = await gitHubClient.getPrForCommitAsync(commitSha);
    if (!pr) {
      terminal.writeLine('No PR found for this commit. Skipping publish.');
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    terminal.writeLine(`Found PR #${pr.number}: "${pr.title}"`);

    // Log all labels on the PR to aid debugging.
    const labelNames: string[] = pr.labels.map(({ name }) => name ?? '(unnamed)');
    terminal.writeLine(labelNames.length > 0 ? `PR labels: ${labelNames.join(', ')}` : 'PR has no labels.');

    let sourceBuildLabel: string | undefined;
    for (const { name } of pr.labels) {
      if (name?.startsWith('SourceBuild:')) {
        if (!sourceBuildLabel) {
          sourceBuildLabel = name;
        } else {
          throw new Error(
            `Multiple SourceBuild: labels found on PR #${pr.number}. Unable to determine originating pipeline run.`
          );
        }
      }
    }

    if (!sourceBuildLabel) {
      terminal.writeLine(`PR #${pr.number} does not have a SourceBuild: label. Skipping publish.`);
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    const buildIdString: string = sourceBuildLabel.slice(sourceBuildLabel.indexOf(':') + 1);
    const buildId: number = parseInt(buildIdString, 10);
    if (isNaN(buildId)) {
      throw new Error(
        `Could not parse build ID from label "${sourceBuildLabel}". ` +
          `Expected format: "SourceBuild:<number>", got value after colon: "${buildIdString}".`
      );
    }

    terminal.writeLine(`Bump pipeline run ID: ${buildId} (from label "${sourceBuildLabel}")`);

    // --- Download artifacts via AzDO API ---

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
        targetPath: `${targetPath}/${artifactName}`
      });
      terminal.writeLine('');
    }

    terminal.writeLine(`All ${artifactNames.length} artifact(s) downloaded successfully.`);
    terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
  }
}
