// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { type IRequiredCommandLineStringParameter, CommandLineAction } from '@rushstack/ts-command-line';

import {
  githubGetAsync,
  githubRequestAsync,
  type IGitHubLabel,
  type IGitHubPr
} from '../../utilities/GitHubUtilities';
import { getAuthHeaderAsync, getRepoSlugAsync } from '../../utilities/GitUtilities';

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
    const [owner] = repoSlug.split('/');
    terminal.writeLine(`Repository: ${repoSlug}`);

    const authHeader: string = await getAuthHeaderAsync();
    const apiBase: string = `https://api.github.com/repos/${repoSlug}`;

    // Check for existing open PR from this branch
    const branchName: string = this._branchNameParameter.value;
    const [existingPr]: IGitHubPr[] = await githubGetAsync<IGitHubPr[]>({
      url: `${apiBase}/pulls?head=${encodeURIComponent(`${owner}:${branchName}`)}&state=open`,
      authHeader
    });

    const title: string = this._titleParameter.value;
    const body: string = this._bodyParameter.value;

    let prNumber: number;
    if (existingPr) {
      ({ number: prNumber } = existingPr);
      terminal.writeLine(`Updating existing PR #${prNumber}`);

      await githubRequestAsync({
        url: `${apiBase}/pulls/${prNumber}`,
        method: 'PATCH',
        authHeader,
        jsonBody: {
          title,
          body
        }
      });

      terminal.writeLine(`PR #${prNumber} updated.`);
    } else {
      terminal.writeLine('Creating new PR');

      const baseBranch: string = this._baseBranchParameter.value;
      ({ number: prNumber } = await githubRequestAsync<IGitHubPr>({
        url: `${apiBase}/pulls`,
        method: 'POST',
        authHeader,
        jsonBody: {
          title,
          body,
          head: branchName,
          base: baseBranch
        }
      }));

      terminal.writeLine(`Created PR #${prNumber}`);
    }

    // Apply SourceBuild label
    const sourceBuildLabel: string = this._sourceBuildLabelParameter.value;
    terminal.writeLine(`Applying label: ${sourceBuildLabel}`);

    // Remove any existing SourceBuild: labels
    const existingLabels: IGitHubLabel[] = await githubGetAsync<IGitHubLabel[]>({
      url: `${apiBase}/issues/${prNumber}/labels`,
      authHeader
    });

    for (const label of existingLabels) {
      if (label.name.startsWith('SourceBuild:')) {
        const encodedLabel: string = encodeURIComponent(label.name);
        try {
          await githubRequestAsync({
            url: `${apiBase}/issues/${prNumber}/labels/${encodedLabel}`,
            method: 'DELETE',
            authHeader
          });
        } catch {
          // Ignore errors when removing old labels
        }
      }
    }

    // Add the new label
    await githubRequestAsync({
      url: `${apiBase}/issues/${prNumber}/labels`,
      method: 'POST',
      authHeader,
      jsonBody: { labels: [sourceBuildLabel] }
    });

    terminal.writeLine('Label applied.');
  }
}
