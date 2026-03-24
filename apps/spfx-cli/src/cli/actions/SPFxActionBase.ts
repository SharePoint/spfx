// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  type CommandLineStringParameter,
  type ICommandLineActionOptions
} from '@rushstack/ts-command-line';
import {
  PublicGitHubRepositorySource,
  type SPFxTemplateRepositoryManager
} from '@microsoft/spfx-template-api';

import {
  DEFAULT_GITHUB_REPO,
  SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME,
  parseGitHubUrlAndRef
} from '../../utilities/github';

/**
 * Base class for SPFx CLI actions that work with template sources.
 * Defines the shared `--template-url` and `--spfx-version` parameters and provides
 * a helper to register a GitHub template source on a repository manager.
 */
export abstract class SPFxActionBase extends CommandLineAction {
  protected readonly _terminal: Terminal;
  protected readonly _templateUrlParameter: CommandLineStringParameter;
  protected readonly _spfxVersionParameter: CommandLineStringParameter;

  protected constructor(options: ICommandLineActionOptions, terminal: Terminal) {
    super(options);

    this._terminal = terminal;

    this._templateUrlParameter = this.defineStringParameter({
      parameterLongName: '--template-url',
      argumentName: 'URL',
      description: `URL of the GitHub template repository. Defaults to ${DEFAULT_GITHUB_REPO}.`,
      environmentVariable: SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME
    });

    this._spfxVersionParameter = this.defineStringParameter({
      parameterLongName: '--spfx-version',
      argumentName: 'VERSION',
      description:
        'The SPFx version to use (e.g., "1.22", "1.23-rc.0"). Resolves to the "version/<VERSION>" branch ' +
        "in the template repository. Defaults to the repository's default branch (main)."
    });
  }

  /**
   * Parses the template URL from `--template-url` (or the provided override), emits a warning
   * when `--template-url` contains a `/tree/` branch that conflicts with `--spfx-version`,
   * then registers a {@link PublicGitHubRepositorySource} on the given manager.
   */
  protected _addGitHubTemplateSource(manager: SPFxTemplateRepositoryManager): void {
    const rawUrl: string = (this._templateUrlParameter.value ?? '').trim() || DEFAULT_GITHUB_REPO;
    const { repoUrl, urlBranch } = parseGitHubUrlAndRef(rawUrl);

    // Map user-supplied version like "1.22" to branch "version/1.22"; pass through
    // if it already starts with "version/".
    let spfxVersionBranch: string | undefined;
    const trimmedVersion: string | undefined = this._spfxVersionParameter.value?.trim();
    if (trimmedVersion) {
      spfxVersionBranch = trimmedVersion.startsWith('version/')
        ? trimmedVersion
        : `version/${trimmedVersion}`;
    }

    if (spfxVersionBranch !== undefined && urlBranch !== undefined) {
      this._terminal.writeWarningLine(
        `${this._templateUrlParameter.longName} contains a branch ('/tree/${urlBranch}'). ` +
          `${this._spfxVersionParameter.longName} "${trimmedVersion}" will take precedence.`
      );
    }
    const ref: string | undefined = spfxVersionBranch ?? urlBranch;

    this._terminal.writeLine(`Using GitHub template source: ${repoUrl}${ref ? ` (branch: ${ref})` : ''}`);
    manager.addSource(new PublicGitHubRepositorySource(repoUrl, ref, this._terminal));
  }
}
