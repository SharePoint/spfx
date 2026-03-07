// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonMergeHelper } from './JsonMergeHelper';

interface IConfigJson {
  $schema?: string;
  version?: string;
  bundles?: Record<string, unknown>;
  localizedResources?: Record<string, string>;
  externals?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Merge helper for `config/config.json`.
 *
 * Strategy:
 * - Merge `bundles` by key (each component has a unique bundle name)
 * - Merge `localizedResources` by key
 * - Merge `externals` by key
 * - Preserve `$schema`, `version`, and other fields from existing
 *
 * @public
 */
export class ConfigJsonMergeHelper extends JsonMergeHelper {
  public get fileRelativePath(): string {
    return 'config/config.json';
  }

  public merge(existingContent: string, newContent: string): string {
    const existing: IConfigJson = this.parseJson<IConfigJson>(existingContent);
    const incoming: IConfigJson = this.parseJson<IConfigJson>(newContent);

    const merged: IConfigJson = { ...existing };

    merged.bundles = { ...existing.bundles, ...incoming.bundles };
    merged.localizedResources = { ...existing.localizedResources, ...incoming.localizedResources };
    merged.externals = { ...existing.externals, ...incoming.externals };

    return this.serializeJson(merged);
  }
}
