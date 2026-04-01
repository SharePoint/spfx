// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';

import {
  type IGitHubAuthorizationHeader,
  parseGitHubAuthorizationHeader
} from '../../utilities/GitHubClient';
import { getGitHubAuthorizationHeaderAsync, getRepoSlugAsync } from '../../utilities/GitUtilities';
import { GitHubTokenActionBase } from './GitHubTokenActionBase';

/**
 * Emits GitHub-related pipeline output variables for use by downstream stages.
 *
 * Outputs:
 *   - GitHubRepoSlug  — e.g. "SharePoint/spfx"
 *   - GitHubToken     — Authorization header value (secret)
 *
 * GitHubToken is read from the GITHUB_TOKEN environment variable if present
 * (injected by the 1ES pipeline template's 'Get GitHub Token' step) and
 * normalized to a full Authorization header value. Falls back to the git
 * credential stored in the checkout extraheader for environments without
 * the 1ES template.
 */
export class EmitGitHubVarsAction extends GitHubTokenActionBase<false> {
  private readonly _terminal: ITerminal;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'emit-github-vars',
      summary: 'Emits GitHub repo slug and auth token as AzDO output variables.',
      documentation:
        'Reads the GitHub repository slug from the local git remote and the authorization token ' +
        'from --github-token / GITHUB_TOKEN (if set) or the git checkout credential, then emits ' +
        'them as GitHubRepoSlug and GitHubToken AzDO output variables for use by downstream stages.',
      githubTokenRequired: false
    });

    this._terminal = terminal;
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const repoSlug: string = await getRepoSlugAsync(terminal);
    terminal.writeLine(`##vso[task.setvariable variable=GitHubRepoSlug;isOutput=true]${repoSlug}`);
    terminal.writeLine(`Emitted GitHubRepoSlug: ${repoSlug}`);

    const { value: rawToken, environmentVariable, longName } = this._githubTokenParameter;
    let authHeader: IGitHubAuthorizationHeader;
    if (rawToken) {
      authHeader = parseGitHubAuthorizationHeader(rawToken);
      terminal.writeLine(`Using ${environmentVariable} from environment or ${longName} as GitHub token`);
    } else {
      authHeader = await getGitHubAuthorizationHeaderAsync(terminal);
      terminal.writeLine('Using git credential extraheader as fallback');
    }

    terminal.writeLine(
      `##vso[task.setvariable variable=GitHubToken;isSecret=true;isOutput=true]${authHeader.header}`
    );
    terminal.writeLine('Emitted GitHubToken (secret)');
  }
}
