// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxTemplate, SPFxTemplateCategory } from '../templating';

/**
 * @public
 * Represents a single template entry in the JSON output produced by
 * {@link SPFxTemplateCollection.toJsonString}.
 */
export interface ITemplateJsonOutputEntry {
  /** The unique name of the template (matches the folder name in the template repository). */
  name: string;
  /** The category of the template. */
  category: SPFxTemplateCategory;
  /**
   * A human-readable description of what the template scaffolds.
   * Empty string when the template does not declare a description.
   */
  description: string;
  /** The semantic version of the template itself. */
  version: string;
  /** The SPFx framework version that the template targets. */
  spfxVersion: string;
  /** The number of files contained in the template. */
  fileCount: number;
}

/**
 * @public
 * Represents a collection of SharePoint Framework (SPFx) templates.
 * These are a map from template name to template instance.
 */
export class SPFxTemplateCollection extends Map<string, SPFxTemplate> {
  /**
   * Creates a new SPFxTemplateCollection from an array of templates.
   * @param templates - An array of SPFxTemplate instances to include in the collection
   */
  public constructor(templates: SPFxTemplate[]) {
    super(templates.map((template) => [template.name, template]));
  }

  /**
   * Returns a JSON string representation of the collection as an array of template objects.
   * Each object includes `name`, `category`, `description`, `version`, `spfxVersion`, and `fileCount`.
   *
   * @remarks
   * Unlike {@link SPFxTemplateCollection.toFormattedStringAsync}, this method is synchronous
   * because it has no external dependencies.
   *
   * @returns A pretty-printed JSON string
   */
  public toJsonString(): string {
    const items: ITemplateJsonOutputEntry[] = [];
    for (const template of this.values()) {
      items.push({
        name: template.name,
        category: template.category,
        description: template.description ?? '',
        version: template.version,
        spfxVersion: template.spfxVersion,
        fileCount: template.fileCount
      });
    }
    return JSON.stringify(items, undefined, 2);
  }

  /**
   * Returns a formatted table string representation of the collection.
   * Uses cli-table3, which is loaded asynchronously to reduce startup cost.
   * @returns A Promise that resolves to a formatted table string with collection details
   */
  public async toFormattedStringAsync(): Promise<string> {
    if (this.size === 0) {
      return 'No templates found.';
    }

    const { default: TableConstructor } = await import('cli-table3');

    const table: InstanceType<typeof TableConstructor> = new TableConstructor({
      head: ['Name', 'Category', 'Description', 'Version', 'SPFx Version', 'Files']
    });

    for (const template of this.values()) {
      table.push([
        template.name,
        template.category,
        template.description || 'N/A',
        template.version,
        template.spfxVersion,
        template.fileCount
      ]);
    }

    return `Found ${this.size} template${this.size === 1 ? '' : 's'}:\n\n${table.toString()}`;
  }
}
