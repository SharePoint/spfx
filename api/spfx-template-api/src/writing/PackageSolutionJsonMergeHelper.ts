// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { IFeature, IPackageSolution, ISolution } from '@microsoft/spfx-heft-plugins';

import { JsonMergeHelper } from './JsonMergeHelper';

/**
 * Merge helper for `config/package-solution.json`.
 *
 * Strategy:
 * - Preserve all solution-level metadata (name, id, version, developer, paths)
 * - Append new `features` entries, deduplicating by feature `id` (GUID)
 *
 * @public
 */
export class PackageSolutionJsonMergeHelper extends JsonMergeHelper {
  public readonly fileRelativePath: string = 'config/package-solution.json';

  public merge(existingContent: string, newContent: string): string {
    const existing: Partial<IPackageSolution> = this.parseJson<Partial<IPackageSolution>>(existingContent);
    const incoming: Partial<IPackageSolution> = this.parseJson<Partial<IPackageSolution>>(newContent);

    const merged: Partial<IPackageSolution> = { ...existing };

    if (existing.solution || incoming.solution) {
      // Spread existing first, then overlay incoming metadata for keys absent in existing
      merged.solution = { ...incoming.solution, ...existing.solution } as ISolution;

      const existingFeatures: IFeature[] = existing.solution?.features ?? [];
      const incomingFeatures: IFeature[] = incoming.solution?.features ?? [];

      const existingIds: Set<string> = new Set(existingFeatures.map((f) => f.id));
      const newFeatures: IFeature[] = incomingFeatures.filter((f) => !existingIds.has(f.id));

      merged.solution.features = [...existingFeatures, ...newFeatures];
    }

    return this.serializeJson(merged, existingContent);
  }
}
