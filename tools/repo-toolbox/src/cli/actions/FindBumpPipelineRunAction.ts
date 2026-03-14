// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { type IRequiredCommandLineStringParameter, CommandLineAction } from '@rushstack/ts-command-line';

import { GitHubClient, type ICommitPr } from '../../utilities/GitHubClient';

export class FindBumpPipelineRunAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'find-bump-pipeline-run',
      summary:
        'Checks whether the current commit is a version bump merge and, if so, outputs the originating pipeline run ID.',
      documentation:
        'Looks up the PR associated with the specified commit SHA. If a SourceBuild: label is found, ' +
        'sets the AzDO output variables IsVersionBumpMerge (true/false) and BumpPipelineRunId (the build ID).'
    });

    this._terminal = terminal;

    this._commitShaParameter = this.defineStringParameter({
      parameterLongName: '--commit-sha',
      argumentName: 'SHA',
      description: 'The merge commit SHA to look up',
      required: true,
      environmentVariable: 'BUILD_SOURCEVERSION'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const commitSha: string = this._commitShaParameter.value;
    terminal.writeLine(`Merge commit SHA: ${commitSha}`);

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

    terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
    terminal.writeLine(`##vso[task.setvariable variable=BumpPipelineRunId;isOutput=true]${buildId}`);
  }
}
