// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { CommandLineStringListParameter } from '@rushstack/ts-command-line';
import type { Terminal } from '@rushstack/terminal';
import {
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  type SPFxTemplateCollection,
  SPFxTemplateRepositoryManager
} from '@microsoft/spfx-template-api';

import { parseGitHubUrlAndRef } from '../../utilities/github';
import { SPFxActionBase } from './SPFxActionBase';

export class ListTemplatesAction extends SPFxActionBase {
  private readonly _localSourcesParameter: CommandLineStringListParameter;
  private readonly _remoteSourcesParameter: CommandLineStringListParameter;

  public constructor(terminal: Terminal) {
    super(
      {
        actionName: 'list-templates',
        summary: 'Lists available SPFx templates from configured sources',
        documentation:
          'This command lists all available templates from the default GitHub source ' +
          'and any additional sources specified with --local-source or --remote-source.'
      },
      terminal
    );

    this._localSourcesParameter = this.defineStringListParameter({
      parameterLongName: '--local-source',
      argumentName: 'PATH',
      description: 'Path to a local template folder to include (repeatable)'
    });

    this._remoteSourcesParameter = this.defineStringListParameter({
      parameterLongName: '--remote-source',
      argumentName: 'URL',
      description: 'Public GitHub repository URL to include as an additional template source (repeatable)'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: Terminal = this._terminal;

    try {
      const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

      // Additive model: default GitHub source is always added first
      this._addGitHubTemplateSource(manager);

      // Additive: also include any --local-source paths
      for (const localPath of this._localSourcesParameter.values) {
        terminal.writeLine(`Adding local template source: ${localPath}`);
        manager.addSource(new LocalFileSystemRepositorySource(localPath));
      }

      // Additive: also include any --remote-source URLs
      for (const remoteUrl of this._remoteSourcesParameter.values) {
        const { repoUrl: additionalRepoUrl, urlBranch: additionalUrlBranch } =
          parseGitHubUrlAndRef(remoteUrl);
        terminal.writeLine(
          `Adding remote template source: ${additionalRepoUrl}` +
            `${additionalUrlBranch ? ` (branch: ${additionalUrlBranch})` : ''}`
        );
        manager.addSource(new PublicGitHubRepositorySource(additionalRepoUrl, additionalUrlBranch, terminal));
      }

      let templates: SPFxTemplateCollection;
      try {
        templates = await manager.getTemplatesAsync();
      } catch (fetchError: unknown) {
        const fetchMessage: string = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(
          `Failed to fetch templates. If you are offline or behind a firewall, ` +
            `use ${this._localSourcesParameter.longName} to specify a local template source. Details: ${fetchMessage}`,
          { cause: fetchError }
        );
      }

      terminal.writeLine(templates.toString());
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      terminal.writeErrorLine(`Error listing templates: ${message}`);
      throw error;
    }
  }
}
