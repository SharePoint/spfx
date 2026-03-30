// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { lt as semverLt, valid as semverValid } from 'semver';

import { ENGINE_VERSION } from '../engineVersion';
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
   *
   * After collecting templates, checks that all templates are compatible with
   * the current engine version. If any template declares a `minimumEngineVersion`
   * higher than {@link ENGINE_VERSION}, a single aggregated error is thrown.
   *
   * @returns A Promise that resolves to a SPFxTemplateCollection containing all templates
   */
  public async getTemplatesAsync(): Promise<SPFxTemplateCollection> {
    const templates: Array<Array<SPFxTemplate>> = await Promise.all(
      this._sources.map((source) => source.getTemplatesAsync())
    );
    const allTemplates: SPFxTemplate[] = templates.flat();

    // Check engine version compatibility across all templates
    const incompatible: { name: string; required: string }[] = [];
    let highestRequired: string | undefined;

    for (const template of allTemplates) {
      const required: string | undefined = template.minimumEngineVersion;
      if (required) {
        if (!semverValid(required)) {
          throw new Error(
            `Template "${template.name}" declares an invalid minimumEngineVersion: "${required}". ` +
              `Expected a valid semver string (e.g. "1.0.0").`
          );
        }
        if (semverLt(ENGINE_VERSION, required)) {
          incompatible.push({ name: template.name, required });
          if (!highestRequired || semverLt(highestRequired, required)) {
            highestRequired = required;
          }
        }
      }
    }

    if (incompatible.length > 0) {
      throw new Error(
        `${incompatible.length} template(s) require engine version ${highestRequired} or later, ` +
          `but your version is ${ENGINE_VERSION}. ` +
          `Please update your SPFx tooling to a compatible version.`
      );
    }

    return new SPFxTemplateCollection(allTemplates);
  }
}
