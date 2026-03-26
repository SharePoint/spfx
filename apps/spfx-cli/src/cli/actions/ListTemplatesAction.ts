// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { Terminal } from '@rushstack/terminal';
import { type SPFxTemplateCollection, SPFxTemplateRepositoryManager } from '@microsoft/spfx-template-api';

import { SPFxActionBase } from './SPFxActionBase';

export class ListTemplatesAction extends SPFxActionBase {
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
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: Terminal = this._terminal;

    try {
      const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

      // Additive model: default GitHub source is always added first
      this._addGitHubTemplateSource(manager);

      // Additive: also include any --local-source paths
      this._addLocalTemplateSources(manager);

      // Additive: also include any --remote-source URLs
      this._addRemoteSources(manager);

      const templates: SPFxTemplateCollection = await this._fetchTemplatesAsync(manager);

      const formattedTable: string = await templates.toFormattedStringAsync();
      terminal.writeLine(formattedTable);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      terminal.writeErrorLine(`Error listing templates: ${message}`);
      throw error;
    }
  }
}
