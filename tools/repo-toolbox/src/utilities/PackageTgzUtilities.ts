// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable, type IPackageJson } from '@rushstack/node-core-library';
import type { IChangelog, IChangeLogComment, IChangeLogEntry } from '@microsoft/rush-lib/lib/api/Changelog';
import { ChangelogGenerator } from '@microsoft/rush-lib/lib/logic/ChangelogGenerator';

// TypeScript marks _getChangeComments as private, but it is accessible at runtime.
type GetChangeCommentsFn = (title: string, comments: IChangeLogComment[] | undefined) => string;
const { _getChangeComments }: { _getChangeComments: GetChangeCommentsFn } = ChangelogGenerator as unknown as {
  _getChangeComments: GetChangeCommentsFn;
};

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
 * Extracts and renders the changelog section for the specified version from the
 * CHANGELOG.json in a .tgz package as a markdown string, using Rush's
 * ChangelogGenerator._getChangeComments for rendering.
 *
 * Returns undefined if the CHANGELOG.json is not present or the version entry is not found.
 */
export async function readChangelogSectionFromTgzAsync(
  tgzPath: string,
  version: string
): Promise<string | undefined> {
  const tarProcess: ChildProcess = Executable.spawn('tar', ['-xOzf', tgzPath, 'package/CHANGELOG.json']);
  const { exitCode, stdout } = await Executable.waitForExitAsync(tarProcess, { encoding: 'utf8' });
  if (exitCode !== 0 || !stdout.trim()) {
    return undefined;
  }

  const changelog: IChangelog = JSON.parse(stdout);
  const entry: IChangeLogEntry | undefined = changelog.entries.find((e) => e.version === version);
  if (!entry) {
    return undefined;
  }

  const sections: string = [
    _getChangeComments('Breaking changes', entry.comments.major),
    _getChangeComments('Minor changes', entry.comments.minor),
    _getChangeComments('Patches', entry.comments.patch),
    _getChangeComments('Hotfixes', entry.comments.hotfix),
    _getChangeComments('Updates', entry.comments.none)
  ]
    .join('')
    .trim();

  return sections || '_Version update only_';
}
