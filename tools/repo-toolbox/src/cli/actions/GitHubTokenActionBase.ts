// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ICommandLineActionOptions, CommandLineStringParameter } from '@rushstack/ts-command-line';
import { CommandLineAction } from '@rushstack/ts-command-line';

/**
 * Base class for actions that need a GitHub token. Defines a `--github-token` parameter
 * backed by the `GITHUB_TOKEN` environment variable (set by the 1ES pipeline template's
 * 'Get GitHub Token' step). Accepts either a raw installation token (e.g. `ghs_xxx`) or a
 * full Authorization header value (e.g. `basic <base64>`).
 */
export abstract class GitHubTokenActionBase extends CommandLineAction {
  protected readonly _githubTokenParameter: CommandLineStringParameter;

  protected constructor(options: ICommandLineActionOptions) {
    super(options);

    this._githubTokenParameter = this.defineStringParameter({
      parameterLongName: '--github-token',
      argumentName: 'TOKEN',
      environmentVariable: 'GITHUB_TOKEN',
      description:
        'GitHub token. Accepts a raw installation token (e.g. `ghs_xxx`) or a full Authorization header value (e.g. `basic <base64>`).',
      required: false
    });
  }
}
