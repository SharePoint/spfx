// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { type IRequiredCommandLineStringParameter, CommandLineAction } from '@rushstack/ts-command-line';
import { Async } from '@rushstack/node-core-library';

import { getGitAuthorizationHeaderAsync, getRepoSlugAsync } from '../../utilities/GitUtilities';
import { GitHubClient, type IGitHubLabel, type IGitHubPr } from '../../utilities/GitHubClient';

export class CreateOrUpdatePrAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _branchNameParameter: IRequiredCommandLineStringParameter;
  private readonly _baseBranchParameter: IRequiredCommandLineStringParameter;
  private readonly _titleParameter: IRequiredCommandLineStringParameter;
  private readonly _bodyParameter: IRequiredCommandLineStringParameter;
  private readonly _sourceBuildLabelParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'create-or-update-pr',
      summary: 'Creates or updates a pull request for the repository. To be used only on AzDO pipelines.',
      documentation: ''
    });

    this._terminal = terminal;

    this._branchNameParameter = this.defineStringParameter({
      parameterLongName: '--branch-name',
      argumentName: 'BRANCH',
      description: 'The source branch for the pull request',
      required: true
    });

    this._baseBranchParameter = this.defineStringParameter({
      parameterLongName: '--base-branch',
      argumentName: 'BRANCH',
      description: 'The target branch for the pull request',
      defaultValue: 'main'
    });

    this._titleParameter = this.defineStringParameter({
      parameterLongName: '--title',
      argumentName: 'TITLE',
      description: 'The pull request title',
      required: true,
      environmentVariable: 'PR_TITLE'
    });

    this._bodyParameter = this.defineStringParameter({
      parameterLongName: '--body',
      argumentName: 'BODY',
      description: 'The pull request body',
      defaultValue: '',
      environmentVariable: 'PR_BODY'
    });

    this._sourceBuildLabelParameter = this.defineStringParameter({
      parameterLongName: '--source-build-label',
      argumentName: 'LABEL',
      description:
        'A label to apply to the PR to track the originating pipeline run (e.g., SourceBuild:12345)',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const repoSlug: string = await getRepoSlugAsync();
    const [owner, repo] = repoSlug.split('/');
    if (!owner || !repo) {
      throw new Error(`Unable to determine repository owner or name from slug: ${repoSlug}`);
    }

    terminal.writeLine(`Repository: ${repoSlug}`);

    const authorizationHeader: string = await getGitAuthorizationHeaderAsync();
    const gitHubClient: GitHubClient = new GitHubClient({ authorizationHeader, owner, repo });

    // Check for existing open PR from this branch
    const branchName: string = this._branchNameParameter.value;
    const existingPr: IGitHubPr | undefined = await gitHubClient.getPrForBranchAsync({ branchName });

    const title: string = this._titleParameter.value;
    const body: string = this._bodyParameter.value;

    let prNumber: number;
    if (existingPr) {
      ({ number: prNumber } = existingPr);
      terminal.writeLine(`Updating existing PR #${prNumber}`);
      await gitHubClient.updatePrDescriptionAsync({ prNumber, title, body });
      terminal.writeLine(`PR #${prNumber} updated.`);
    } else {
      terminal.writeLine('Creating new PR');
      const baseBranch: string = this._baseBranchParameter.value;
      ({ number: prNumber } = await gitHubClient.openPrAsync({ title, body, branchName, baseBranch }));
      terminal.writeLine(`Created PR #${prNumber}`);
    }

    // Apply SourceBuild label
    const sourceBuildLabel: string = this._sourceBuildLabelParameter.value;
    terminal.writeLine(`Applying label: ${sourceBuildLabel}`);

    // Remove any existing SourceBuild: labels
    const existingLabels: IGitHubLabel[] = await gitHubClient.getPrLabelsAsync(prNumber);

    await Async.forEachAsync(
      existingLabels,
      async ({ name: labelName }) => {
        if (labelName.startsWith('SourceBuild:')) {
          await gitHubClient.deletePrLabelAsync({ prNumber, labelName });
        }
      },
      { concurrency: 5 }
    );

    // Add the new label
    await gitHubClient.addPrLabelAsync({ prNumber, labelName: sourceBuildLabel });

    terminal.writeLine('Label applied.');
  }
}
