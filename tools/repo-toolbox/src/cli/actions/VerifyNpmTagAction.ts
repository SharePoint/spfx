// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Async, Executable, FileSystem } from '@rushstack/node-core-library';
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

    const tgzFiles: string[] = (await FileSystem.readFolderItemNamesAsync(packagesPath))
      .filter((f) => f.endsWith('.tgz'))
      .map((f) => `${packagesPath}/${f}`);

    if (tgzFiles.length === 0) {
      throw new Error(`No .tgz packages found in ${packagesPath}`);
    }

    let hasFailure: boolean = false;

    await Async.forEachAsync(
      tgzFiles,
      async (tgzPath: string) => {
        terminal.writeLine(`Verifying package: ${tgzPath}`);

        let packageInfo: IPackageInfo;
        try {
          packageInfo = await _readPackageInfoFromTgzAsync(tgzPath);
        } catch (e) {
          terminal.writeErrorLine(`Unable to read package metadata from ${tgzPath}: ${e}`);
          hasFailure = true;
          return;
        }

        const { name: packageName, version: packageVersion } = packageInfo;
        terminal.writeLine(`Package name: ${packageName}`);
        terminal.writeLine(`Package version: ${packageVersion}`);

        const npmProcess: ChildProcess = Executable.spawn('npm', [
          'view',
          `${packageName}@${npmTag}`,
          'version'
        ]);
        const { exitCode, stdout } = await Executable.waitForExitAsync(npmProcess, {
          encoding: 'utf8'
        });
        const taggedVersion: string | undefined = exitCode === 0 ? stdout.trim() || undefined : undefined;

        if (packageVersion !== taggedVersion) {
          terminal.writeErrorLine(
            `Version mismatch for ${packageName}: expected ${packageVersion} at tag "${npmTag}", found "${taggedVersion}".`
          );
          hasFailure = true;
          return;
        }

        terminal.writeLine(`Package ${packageName}@${packageVersion} matches "${npmTag}" tag`);
      },
      { concurrency: 5 }
    );

    if (hasFailure) {
      throw new Error('One or more packages failed npm tag verification.');
    }
  }
}

async function _readPackageInfoFromTgzAsync(tgzPath: string): Promise<IPackageInfo> {
  const tarProcess: ChildProcess = Executable.spawn('tar', ['-xOzf', tgzPath, 'package/package.json']);
  const { exitCode, stdout, stderr } = await Executable.waitForExitAsync(tarProcess, {
    encoding: 'utf8'
  });
  if (exitCode !== 0) {
    throw new Error(`tar exited with status ${exitCode}: ${stderr}`);
  }
  const { name, version }: { name: string; version: string } = JSON.parse(stdout);
  return { name, version };
}
