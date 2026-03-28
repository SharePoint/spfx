// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SpawnSyncReturns } from 'node:child_process';

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Executable, FileSystem } from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

interface IPackageInfo {
  name: string;
  version: string;
}

/**
 * Verifies that each .tgz package in a directory has been published to npm under the expected tag.
 */
export class VerifyNpmTagAction extends CommandLineAction {
  private readonly _terminal: ITerminal;
  private readonly _packagesPathParameter: IRequiredCommandLineStringParameter;
  private readonly _npmTagParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'verify-npm-tag',
      summary: 'Verifies that the version of each .tgz package in a directory matches the expected npm tag.',
      documentation: ''
    });

    this._terminal = terminal;
    this._packagesPathParameter = this.defineStringParameter({
      parameterLongName: '--packages-path',
      argumentName: 'PATH',
      description: 'Path to directory containing .tgz package files.',
      required: true
    });
    this._npmTagParameter = this.defineStringParameter({
      parameterLongName: '--npm-tag',
      argumentName: 'TAG',
      description: 'The npm tag to verify against (e.g., "latest").',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;
    const packagesPath: string = this._packagesPathParameter.value;
    const npmTag: string = this._npmTagParameter.value;

    const tgzFiles: string[] = FileSystem.readFolderItemNames(packagesPath)
      .filter((f) => f.endsWith('.tgz'))
      .map((f) => `${packagesPath}/${f}`);

    if (tgzFiles.length === 0) {
      throw new Error(`No .tgz packages found in ${packagesPath}`);
    }

    let hasFailure: boolean = false;

    for (const tgzPath of tgzFiles) {
      terminal.writeLine(`Verifying package: ${tgzPath}`);

      let packageInfo: IPackageInfo;
      try {
        packageInfo = _readPackageInfoFromTgz(tgzPath);
      } catch (e) {
        terminal.writeErrorLine(`Unable to read package metadata from ${tgzPath}: ${e}`);
        hasFailure = true;
        continue;
      }

      const { name: packageName, version: packageVersion } = packageInfo;
      terminal.writeLine(`Package name: ${packageName}`);
      terminal.writeLine(`Package version: ${packageVersion}`);

      const npmResult: SpawnSyncReturns<string> = Executable.spawnSync('npm', [
        'view',
        `${packageName}@${npmTag}`,
        'version'
      ]);
      const taggedVersion: string | undefined =
        npmResult.status === 0 ? npmResult.stdout.trim() || undefined : undefined;

      if (packageVersion !== taggedVersion) {
        terminal.writeErrorLine(
          `Version mismatch for ${packageName}: expected ${packageVersion} at tag "${npmTag}", found "${taggedVersion}".`
        );
        hasFailure = true;
        continue;
      }

      terminal.writeLine(`Package ${packageName}@${packageVersion} matches "${npmTag}" tag`);
    }

    if (hasFailure) {
      throw new Error('One or more packages failed npm tag verification.');
    }
  }
}

function _readPackageInfoFromTgz(tgzPath: string): IPackageInfo {
  const result: SpawnSyncReturns<string> = Executable.spawnSync('tar', [
    '-xOzf',
    tgzPath,
    'package/package.json'
  ]);
  if (result.status !== 0) {
    throw new Error(`tar exited with status ${result.status}: ${result.stderr}`);
  }
  const { name, version }: { name: string; version: string } = JSON.parse(result.stdout);
  return { name, version };
}
