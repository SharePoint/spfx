// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxTemplate } from '../templating';

/**
 * @public
 * Represents a single template entry in the JSON output produced by
 * {@link SPFxTemplateCollection.toJsonString}.
 */
export interface ITemplateJsonOutputEntry {
  name: string;
  category: string;
  // `null` (not `undefined`) is intentional: JSON.stringify drops `undefined` fields
  // but preserves `null`, ensuring the field is always present in the output.
  // eslint-disable-next-line @rushstack/no-new-null
  description: string | null;
  version: string;
  spfxVersion: string;
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
        description: template.description ?? null,
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
