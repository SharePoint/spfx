// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  type CommandLineStringListParameter,
  type CommandLineStringParameter,
  type ICommandLineActionOptions
} from '@rushstack/ts-command-line';
import {
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  type SPFxTemplateCollection,
  type SPFxTemplateRepositoryManager
} from '@microsoft/spfx-template-api';

import {
  DEFAULT_GITHUB_REPO,
  SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME,
  parseGitHubUrlAndRef
} from '../../utilities/github';

/**
 * Base class for SPFx CLI actions that work with template sources.
 * Defines the shared `--template-url`, `--spfx-version`, `--local-source`, and
 * `--remote-source` parameters and provides helpers for source registration and
 * template fetching with context-aware error messages.
 */
export abstract class SPFxActionBase extends CommandLineAction {
  protected readonly _terminal: Terminal;
  protected readonly _templateUrlParameter: CommandLineStringParameter;
  protected readonly _spfxVersionParameter: CommandLineStringParameter;
  protected readonly _localSourceParameter: CommandLineStringListParameter;
  protected readonly _remoteSourcesParameter: CommandLineStringListParameter;

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

    this._localSourceParameter = this.defineStringListParameter({
      parameterLongName: '--local-source',
      argumentName: 'TEMPLATE_PATH',
      description: 'Path to a local template folder (repeatable)'
    });

    this._remoteSourcesParameter = this.defineStringListParameter({
      parameterLongName: '--remote-source',
      argumentName: 'URL',
      description: 'Public GitHub repository URL to use as an additional template source (repeatable)'
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
    const terminal: Terminal = this._terminal;

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
      terminal.writeWarningLine(
        `${this._templateUrlParameter.longName} contains a branch ('/tree/${urlBranch}'). ` +
          `${this._spfxVersionParameter.longName} "${trimmedVersion}" will take precedence.`
      );
    }
    const ref: string | undefined = spfxVersionBranch ?? urlBranch;

    terminal.writeLine(`Using GitHub template source: ${repoUrl}${ref ? ` (branch: ${ref})` : ''}`);
    manager.addSource(new PublicGitHubRepositorySource({ repoUrl, branch: ref, terminal }));
  }

  /**
   * Registers a {@link LocalFileSystemRepositorySource} for each `--local-source` path
   * on the given manager.
   */
  protected _addLocalTemplateSources(manager: SPFxTemplateRepositoryManager): void {
    for (const localPath of this._localSourceParameter.values) {
      this._terminal.writeLine(`Adding local template source: ${localPath}`);
      manager.addSource(new LocalFileSystemRepositorySource(localPath));
    }
  }

  /**
   * Processes all `--remote-source` URLs and registers a {@link PublicGitHubRepositorySource}
   * for each on the given manager. Additive with any other sources already registered.
   */
  protected _addRemoteSources(manager: SPFxTemplateRepositoryManager): void {
    const terminal: Terminal = this._terminal;
    for (const remoteUrl of this._remoteSourcesParameter.values) {
      const { repoUrl, urlBranch } = parseGitHubUrlAndRef(remoteUrl);
      terminal.writeLine(
        `Adding remote template source: ${repoUrl}${urlBranch ? ` (branch: ${urlBranch})` : ''}`
      );
      manager.addSource(new PublicGitHubRepositorySource({ repoUrl, branch: urlBranch, terminal }));
    }
  }

  /**
   * Fetches templates from the manager, wrapping errors with a context-aware message.
   * When `--local-source` was provided, the error tells the user to verify their paths.
   * Otherwise, it suggests using `--local-source` as an offline fallback.
   */
  protected async _fetchTemplatesAsync(
    manager: SPFxTemplateRepositoryManager
  ): Promise<SPFxTemplateCollection> {
    try {
      return await manager.getTemplatesAsync();
    } catch (fetchError: unknown) {
      const fetchMessage: string = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (this._localSourceParameter.values.length > 0) {
        throw new Error(
          `Failed to fetch templates. Verify that the specified ${this._localSourceParameter.longName} path(s) exist` +
            ` and that your network connection to any remote sources is available. Details: ${fetchMessage}`,
          { cause: fetchError }
        );
      } else {
        throw new Error(
          `Failed to fetch templates. If you are offline or behind a firewall, ` +
            `use ${this._localSourceParameter.longName} to specify a local template source. Details: ${fetchMessage}`,
          { cause: fetchError }
        );
      }
    }
  }
}
