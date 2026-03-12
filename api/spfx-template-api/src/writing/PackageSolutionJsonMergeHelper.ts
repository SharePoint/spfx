// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonMergeHelper } from './JsonMergeHelper';

interface IFeature {
  id: string;
  [key: string]: unknown;
}

interface ISolution {
  features?: IFeature[];
  [key: string]: unknown;
}

interface IPackageSolutionJson {
  $schema?: string;
  solution?: ISolution;
  paths?: Record<string, string>;
  [key: string]: unknown;
}

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
    const existing: IPackageSolutionJson = this.parseJson<IPackageSolutionJson>(existingContent);
    const incoming: IPackageSolutionJson = this.parseJson<IPackageSolutionJson>(newContent);

    const merged: IPackageSolutionJson = { ...existing };

    if (existing.solution || incoming.solution) {
      // Spread existing first, then overlay incoming metadata for keys absent in existing
      merged.solution = { ...incoming.solution, ...existing.solution };

      const existingFeatures: IFeature[] = existing.solution?.features ?? [];
      const incomingFeatures: IFeature[] = incoming.solution?.features ?? [];

      const existingIds: Set<string> = new Set(existingFeatures.map((f) => f.id));
      const newFeatures: IFeature[] = incomingFeatures.filter((f) => !existingIds.has(f.id));

      merged.solution.features = [...existingFeatures, ...newFeatures];
    }

    return this.serializeJson(merged);
  }
}
