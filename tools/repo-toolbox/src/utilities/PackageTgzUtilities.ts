// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable, type IPackageJson } from '@rushstack/node-core-library';

export async function readPackageInfoFromTgzAsync(tgzPath: string): Promise<IPackageJson> {
  const tarProcess: ChildProcess = Executable.spawn('tar', ['-xOzf', tgzPath, 'package/package.json']);
  const { stdout } = await Executable.waitForExitAsync(tarProcess, {
    encoding: 'utf8',
    throwOnNonZeroExitCode: true,
    throwOnSignal: true
  });
  const packageJson: IPackageJson = JSON.parse(stdout);
  return packageJson;
}

/**
 * Extracts the changelog section for the specified version from the CHANGELOG.md
 * in a .tgz package. Returns undefined if the file is not present or the version
 * section is not found.
 *
 * Rush generates changelogs with version sections starting with `## X.Y.Z`.
 */
export async function readChangelogSectionFromTgzAsync(
  tgzPath: string,
  version: string
): Promise<string | undefined> {
  const tarProcess: ChildProcess = Executable.spawn('tar', ['-xOzf', tgzPath, 'package/CHANGELOG.md']);
  const { exitCode, stdout } = await Executable.waitForExitAsync(tarProcess, { encoding: 'utf8' });
  if (exitCode !== 0 || !stdout.trim()) {
    return undefined;
  }

  const lines: string[] = stdout.split(/\r?\n/);
  const sectionStart: number = lines.findIndex((line) => line.startsWith(`## ${version}`));
  if (sectionStart === -1) {
    return undefined;
  }

  const nextSectionStart: number = lines.findIndex(
    (line, index) => index > sectionStart && line.startsWith('## ')
  );
  const sectionLines: string[] =
    nextSectionStart === -1 ? lines.slice(sectionStart + 1) : lines.slice(sectionStart + 1, nextSectionStart);

  return sectionLines.join('\n').trim() || undefined;
}
