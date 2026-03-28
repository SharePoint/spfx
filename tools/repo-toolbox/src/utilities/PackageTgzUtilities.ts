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
