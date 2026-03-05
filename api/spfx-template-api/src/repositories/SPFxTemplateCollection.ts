// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

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
   * Returns a string representation of the collection including the count and details of all templates.
   * @returns A formatted string with collection details
   */
  public override toString(): string {
    return [
      `# of templates: ${this.size}`,
      ...Array.from(this.values()).map((template) => template.toString() + '\n')
    ].join('\n');
  }
}
