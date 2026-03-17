// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { IConfigJson } from '@microsoft/spfx-heft-plugins';

import { JsonMergeHelper } from './JsonMergeHelper';

/**
 * Merge helper for `config/config.json`.
 *
 * Strategy:
 * - Merge `bundles` by key (each component has a unique bundle name)
 * - Merge `localizedResources` by key
 * - Merge `externals` by key
 * - Incoming wins for scalar fields (`$schema`, `version`, etc.)
 *
 * @public
 */
export class ConfigJsonMergeHelper extends JsonMergeHelper {
  public readonly fileRelativePath: string = 'config/config.json';

  public merge(existingContent: string, newContent: string): string {
    const existing: Partial<IConfigJson> = this.parseJson<Partial<IConfigJson>>(existingContent);
    const incoming: Partial<IConfigJson> = this.parseJson<Partial<IConfigJson>>(newContent);

    const merged: Partial<IConfigJson> = { ...existing, ...incoming };

    // Incoming wins on key collision — each component contributes unique bundle
    // names, so collisions indicate a re-scaffold of the same component.
    if (existing.bundles || incoming.bundles) {
      merged.bundles = { ...existing.bundles, ...incoming.bundles };
    }
    if (existing.localizedResources || incoming.localizedResources) {
      merged.localizedResources = { ...existing.localizedResources, ...incoming.localizedResources };
    }
    if (existing.externals || incoming.externals) {
      merged.externals = { ...existing.externals, ...incoming.externals };
    }

    return this.serializeJson(merged, existingContent);
  }
}
