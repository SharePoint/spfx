// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxTemplate } from '../templating/SPFxTemplate';
import type { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';
import { SPFxTemplateCollection } from './SPFxTemplateCollection';

/**
 * @public
 * Primary utility for working with SPFx template repository sources.
 * This class handles configuring multiple repository sources, pulling them locally,
 * and providing them to the rest of the application.
 */
export class SPFxTemplateRepositoryManager {
  private _sources: Array<BaseSPFxTemplateRepositorySource>;

  public constructor() {
    this._sources = [];
  }

  /**
   * Adds a new template repository source.
   */
  public addSource(source: BaseSPFxTemplateRepositorySource): void {
    this._sources.push(source);
  }

  /**
   * Retrieves all templates from all configured repository sources.
   * @returns A Promise that resolves to a SPFxTemplateCollection containing all templates
   */
  public async getTemplatesAsync(): Promise<SPFxTemplateCollection> {
    const templates: Array<Array<SPFxTemplate>> = await Promise.all(
      this._sources.map((source) => source.getTemplatesAsync())
    );
    return new SPFxTemplateCollection(templates.flat());
  }
}
