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
          'and any additional sources specified with --local-source or --remote-source. ' +
          'Use --spfx-version to filter templates by version (e.g., "--spfx-version 1.22").'
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

      // Apply --spfx-version filter if provided (user expects filter, not just branch selection)
      const spfxVersion: string | undefined = this._spfxVersionParameter.value?.trim();
      // Normalize version prefix: "version/1.22" -> "1.22", "1.22-rc.0" -> "1.22"
      const normalizedVersion: string | undefined = spfxVersion
        ? spfxVersion.replace(/^version\//, '').replace(/-.*$/, '')
        : undefined;
      if (normalizedVersion) {
        // Split into parts and compare major.minor so "1.2" doesn't match "1.20.0"
        const versionParts: string[] = normalizedVersion.split('.');
        const filteredTemplates = [...templates.values()].filter(
          (t) => t.spfxVersion && t.spfxVersion.split('.').slice(0, versionParts.length).join('.') === normalizedVersion
        );
        if (filteredTemplates.length === 0) {
          terminal.writeLine(
            `No templates found for SPFx version "${spfxVersion}". ` +
              `Use "spfx list-templates" (without --spfx-version) to see all available versions.`
          );
          return;
        }
        const displayCollection: SPFxTemplateCollection = new SPFxTemplateCollection(filteredTemplates);
        const formattedTable: string = await displayCollection.toFormattedStringAsync();
        terminal.writeLine(formattedTable);
      } else {
        const formattedTable: string = await templates.toFormattedStringAsync();
        terminal.writeLine(formattedTable);
      }
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      terminal.writeErrorLine(`Error listing templates: ${message}`);
      throw error;
    }
  }
}
