// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { createGitHubClientAsync, execGitAsync } from '../../utilities/GitUtilities';
import type { GitHubClient, ICommitPr } from '../../utilities/GitHubClient';

export class ValidateVersionBumpAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'validate-version-bump',
      summary: 'Checks if the current commit is from a merged version bump PR.',
      documentation:
        'Looks up the PR associated with HEAD, checks for a SourceBuild: label, ' +
        'and sets AzDO output variables IsVersionBumpMerge (true/false).'
    });

    this._terminal = terminal;
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const commitSha: string = await execGitAsync(['rev-parse', 'HEAD']);
    terminal.writeLine(`Merge commit SHA: ${commitSha}`);

    const gitHubClient: GitHubClient = await createGitHubClientAsync();

    const pr: ICommitPr | undefined = await gitHubClient.getPrForCommitAsync(commitSha);
    if (!pr) {
      terminal.writeLine('No PR found for this commit. Skipping publish.');
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    terminal.writeLine(`Found PR #${pr.number}`);

    const sourceBuildLabel: { name?: string } | undefined = pr.labels.find((l: { name?: string }) =>
      l.name?.startsWith('SourceBuild:')
    );

    if (sourceBuildLabel?.name) {
      terminal.writeLine(`Valid version bump PR detected (label: ${sourceBuildLabel.name}).`);
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
    } else {
      terminal.writeLine(`PR #${pr.number} does not have a SourceBuild: label. Skipping publish.`);
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
    }
  }
}
