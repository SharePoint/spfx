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
 * - Throw if any `@microsoft/*` package has a version mismatch (indicates SPFx version conflict)
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

    PackageJsonMergeHelper._checkMicrosoftVersionConflicts(existing.dependencies, incoming.dependencies);
    PackageJsonMergeHelper._checkMicrosoftVersionConflicts(
      existing.devDependencies,
      incoming.devDependencies
    );

    const merged: IPackageJson = { ...existing };

    merged.dependencies = PackageJsonMergeHelper._unionDeps(existing.dependencies, incoming.dependencies);
    merged.devDependencies = PackageJsonMergeHelper._unionDeps(
      existing.devDependencies,
      incoming.devDependencies
    );

    return this.serializeJson(merged);
  }

  /**
   * Throws if any `@microsoft/*` package appears in both maps with different versions.
   */
  private static _checkMicrosoftVersionConflicts(
    existing: Record<string, string> | undefined,
    incoming: Record<string, string> | undefined
  ): void {
    if (!existing || !incoming) {
      return;
    }
    for (const [pkg, incomingVersion] of Object.entries(incoming)) {
      if (pkg.startsWith('@microsoft/') && pkg in existing && existing[pkg] !== incomingVersion) {
        throw new Error(
          `SPFx version mismatch for "${pkg}": existing project uses ${existing[pkg]} ` +
            `but the incoming template requires ${incomingVersion}. ` +
            `All components in a project must use the same SPFx version.`
        );
      }
    }
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
