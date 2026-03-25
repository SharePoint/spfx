// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import Table from 'cli-table3';

import type { SPFxTemplate } from '../templating';

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
   * Returns a string representation of the collection as a formatted table.
   * @returns A formatted table string with collection details
   */
  public override toString(): string {
    if (this.size === 0) {
      return 'No templates found.';
    }

    const table: Table.Table = new Table({
      head: ['Name', 'Category', 'Description', 'Version', 'SPFx Version', 'Files']
    });

    for (const template of this.values()) {
      table.push([
        template.name,
        template.category,
        template.description || 'N/A',
        template.version,
        template.spfxVersion,
        String(template.fileCount)
      ]);
    }

    return `Found ${this.size} template${this.size === 1 ? '' : 's'}:\n\n${table.toString()}`;
  }
}
