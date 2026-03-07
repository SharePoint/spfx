// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonMergeHelper } from './JsonMergeHelper';

interface IPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Merge helper for `package.json`.
 *
 * Strategy:
 * - Union `dependencies` and `devDependencies` — existing versions win on conflict
 * - Preserve all other fields from the existing file
 *
 * @public
 */
export class PackageJsonMergeHelper extends JsonMergeHelper {
  public get fileRelativePath(): string {
    return 'package.json';
  }

  public merge(existingContent: string, newContent: string): string {
    const existing: IPackageJson = this.parseJson<IPackageJson>(existingContent);
    const incoming: IPackageJson = this.parseJson<IPackageJson>(newContent);

    const merged: IPackageJson = { ...existing };

    merged.dependencies = PackageJsonMergeHelper._unionDeps(existing.dependencies, incoming.dependencies);
    merged.devDependencies = PackageJsonMergeHelper._unionDeps(
      existing.devDependencies,
      incoming.devDependencies
    );

    return this.serializeJson(merged);
  }

  /**
   * Union two dependency maps. Incoming entries are added first, then existing
   * entries overwrite — so existing versions win on conflict.
   */
  private static _unionDeps(
    existing: Record<string, string> | undefined,
    incoming: Record<string, string> | undefined
  ): Record<string, string> | undefined {
    if (!incoming && !existing) {
      return undefined;
    }
    return { ...incoming, ...existing };
  }
}
