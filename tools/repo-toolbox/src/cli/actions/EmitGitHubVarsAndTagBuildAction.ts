// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { BUMP_BUILD_TAG_PREFIX } from '../../utilities/BumpVersionsConstants';
import { execGitAsync, getGitAuthorizationHeaderAsync, getRepoSlugAsync } from '../../utilities/GitUtilities';

/**
 * Tags the current AzDO build and emits GitHub-related pipeline variables for use by
 * downstream stages.
 *
 * Outputs:
 *   - GitHubRepoSlug  — e.g. "microsoft/spfx"
 *   - GitHubToken     — Authorization header value from git credentials (secret)
 *   - BumpSha         — HEAD commit SHA of the bump branch
 *
 * Variables are emitted via AzDO logging commands so they are available as
 * job output variables (isOutput=true) in downstream stages.
 */
export class EmitGitHubVarsAndTagBuildAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'emit-github-vars-and-tag-build',
      summary:
        'Tags the AzDO build and emits GitHub repo slug, auth token, and bump SHA as AzDO output variables.',
      documentation: ''
    });

    this._terminal = terminal;
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const repoSlug: string = await getRepoSlugAsync(terminal);
    terminal.writeLine(`##vso[task.setvariable variable=GitHubRepoSlug;isOutput=true]${repoSlug}`);
    terminal.writeLine(`Emitted GitHubRepoSlug: ${repoSlug}`);

    const authHeader: string = await getGitAuthorizationHeaderAsync(terminal);
    terminal.writeLine(
      `##vso[task.setvariable variable=GitHubToken;isSecret=true;isOutput=true]${authHeader}`
    );
    terminal.writeLine('Emitted GitHubToken (secret)');

    const bumpSha: string = await execGitAsync(['rev-parse', 'HEAD'], terminal);
    terminal.writeLine(`##vso[task.setvariable variable=BumpSha;isOutput=true]${bumpSha}`);
    terminal.writeLine(`Emitted BumpSha: ${bumpSha}`);

    const bumpTag: string = `${BUMP_BUILD_TAG_PREFIX}${bumpSha}`;
    terminal.writeLine(`##vso[build.addbuildtag]${bumpTag}`);
    terminal.writeLine(`Tagged build: ${bumpTag}`);
  }
}
