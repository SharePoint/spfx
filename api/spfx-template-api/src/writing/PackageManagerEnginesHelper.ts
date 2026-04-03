// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable, FileSystem, JsonFile, type IPackageJson } from '@rushstack/node-core-library';
import type { ITerminal } from '@rushstack/terminal';

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/typedef
export const VALID_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'] as const;

/**
 * The package managers supported by the SPFx CLI.
 *
 * @public
 */
export type PackageManager = (typeof VALID_PACKAGE_MANAGERS)[number];

const VALID_PACKAGE_MANAGERS_SET: ReadonlySet<PackageManager> = new Set<PackageManager>(
  VALID_PACKAGE_MANAGERS
);

interface IPackageJsonWithEngines extends IPackageJson {
  engines?: Record<string, string>;
}

/**
 * Reads the project's `package.json` and returns the package manager recorded in its `"engines"`
 * field, or `undefined` if none is present or the file does not exist.
 *
 * @throws If multiple known package managers are found in the `"engines"` field.
 *
 * @public
 */
export async function tryReadPackageManagerFromPackageJsonEnginesAsync(
  targetDir: string
): Promise<PackageManager | undefined> {
  const filePath: string = `${targetDir}/package.json`;
  let engines: IPackageJsonWithEngines['engines'] | undefined;
  try {
    const packageJson: IPackageJsonWithEngines = await JsonFile.loadAsync(filePath);
    ({ engines } = packageJson);
  } catch (error) {
    if (!FileSystem.isNotExistError(error)) {
      throw error;
    }
  }

  if (engines) {
    const foundPackageManagers: PackageManager[] = [];
    for (const engine of Object.keys(engines)) {
      const maybePackageManager: PackageManager = engine as PackageManager;
      if (VALID_PACKAGE_MANAGERS_SET.has(maybePackageManager)) {
        foundPackageManagers.push(maybePackageManager);
      }
    }

    if (foundPackageManagers.length > 1) {
      throw new Error(
        `Found multiple package managers in the "engines" field of package.json: ` +
          `${foundPackageManagers.join(', ')}. Only one package manager should be specified.`
      );
    }

    return foundPackageManagers[0];
  }

  return undefined;
}

/**
 * Detects the installed version of the given package manager, then writes a `>=MAJOR` constraint
 * into the `"engines"` field of the project's `package.json`.
 *
 * Emits a warning and skips silently on version-detection or file-read failures so that a missing
 * or undetectable package manager never fails the overall scaffold.
 *
 * @remarks
 * Callers are expected to pass the package manager that is already recorded in `engines` (if any).
 * The CLI enforces this via its existing-project guard, which reads the current value with
 * {@link tryReadPackageManagerFromPackageJsonEnginesAsync} and overrides any conflicting
 * `--package-manager` flag before reaching this function. As a result, this function will never
 * write a different package manager than the one already present, so no cleanup of stale entries
 * is needed.
 *
 * @public
 */
export async function writePackageManagerToPackageJsonEnginesAsync(
  packageManager: PackageManager,
  targetDir: string,
  terminal: ITerminal
): Promise<void> {
  let majorVersion: number | undefined;
  try {
    const versionChild: ChildProcess = Executable.spawn(packageManager, ['--version'], {
      currentWorkingDirectory: targetDir,
      stdio: 'pipe'
    });

    const { stdout } = await Executable.waitForExitAsync(versionChild, {
      throwOnNonZeroExitCode: false,
      throwOnSignal: false,
      encoding: 'utf-8'
    });

    majorVersion = parseInt(stdout.trim(), 10);
  } catch {
    // Ignore - fall through to warning below. This can fail if the package manager is not installed or not on the PATH,
  }

  if (majorVersion === undefined || Number.isNaN(majorVersion)) {
    terminal.writeWarningLine(
      `Could not detect ${packageManager} version; skipping engines field update in package.json.`
    );
  } else {
    const filePath: string = `${targetDir}/package.json`;
    let packageJson: IPackageJsonWithEngines | undefined;
    try {
      packageJson = await JsonFile.loadAsync(filePath);
    } catch (error) {
      if (FileSystem.isNotExistError(error)) {
        terminal.writeWarningLine(
          `Could not find package.json in ${targetDir}; skipping engines field update.`
        );
      } else {
        throw error;
      }
    }

    if (packageJson) {
      packageJson.engines ??= {};
      packageJson.engines[packageManager] = `>=${majorVersion}`;
      await JsonFile.saveAsync(packageJson, filePath, { updateExistingFile: true });
    }
  }
}
