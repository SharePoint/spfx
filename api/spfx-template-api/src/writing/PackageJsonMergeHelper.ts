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
  public readonly fileRelativePath: string = 'package.json';

  public merge(existingContent: string, newContent: string): string {
    const existing: IPackageJson = this.parseJson<IPackageJson>(existingContent);
    const incoming: IPackageJson = this.parseJson<IPackageJson>(newContent);

    // Check @microsoft/* version conflicts across ALL dependency types (deps vs devDeps)
    const existingVersions: Map<string, string> = PackageJsonMergeHelper._collectMicrosoftVersions(
      existing.dependencies,
      existing.devDependencies
    );
    const incomingVersions: Map<string, string> = PackageJsonMergeHelper._collectMicrosoftVersions(
      incoming.dependencies,
      incoming.devDependencies
    );
    PackageJsonMergeHelper._checkMicrosoftVersionConflicts(existingVersions, incomingVersions);

    const merged: IPackageJson = { ...existing };

    merged.dependencies = PackageJsonMergeHelper._unionDeps(existing.dependencies, incoming.dependencies);
    merged.devDependencies = PackageJsonMergeHelper._unionDeps(
      existing.devDependencies,
      incoming.devDependencies
    );

    return this.serializeJson(merged);
  }

  /**
   * Collects all `@microsoft/*` packages from both dependencies and devDependencies
   * into a single map, enabling cross-dep-type conflict detection.
   */
  private static _collectMicrosoftVersions(
    deps?: Record<string, string>,
    devDeps?: Record<string, string>
  ): Map<string, string> {
    const result: Map<string, string> = new Map();
    for (const map of [deps, devDeps]) {
      if (map) {
        for (const [pkg, version] of Object.entries(map)) {
          if (pkg.startsWith('@microsoft/')) {
            result.set(pkg, version);
          }
        }
      }
    }
    return result;
  }

  /**
   * Throws if any `@microsoft/*` package appears in both the existing and
   * incoming version maps with different versions — regardless of whether the
   * package lives in `dependencies` or `devDependencies`.
   */
  private static _checkMicrosoftVersionConflicts(
    existing: Map<string, string>,
    incoming: Map<string, string>
  ): void {
    const mismatches: string[] = [];
    for (const [pkg, incomingVersion] of incoming) {
      const existingVersion: string | undefined = existing.get(pkg);
      if (existingVersion !== undefined && existingVersion !== incomingVersion) {
        mismatches.push(`  "${pkg}": existing ${existingVersion}, incoming ${incomingVersion}`);
      }
    }
    if (mismatches.length > 0) {
      throw new Error(
        `SPFx version mismatch detected. All components in a project must use the same SPFx version.\n` +
          mismatches.join('\n')
      );
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
    // Existing wins — dependencies are globally shared across the project,
    // so the first-scaffolded version is authoritative.
    return { ...incoming, ...existing };
  }
}
