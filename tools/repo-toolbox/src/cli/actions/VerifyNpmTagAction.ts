// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import {
  Async,
  Executable,
  FileSystem,
  type FolderItem,
  type IPackageJson
} from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { readPackageInfoFromTgzAsync } from '../../utilities/PackageTgzUtilities';

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

    const folderItems: FolderItem[] = await FileSystem.readFolderItemsAsync(packagesPath);
    const tgzFiles: string[] = [];
    for (const folderItem of folderItems) {
      const folderItemName: string = folderItem.name;
      if (folderItem.isFile() && folderItemName.endsWith('.tgz')) {
        const fullPath: string = `${packagesPath}/${folderItemName}`;
        tgzFiles.push(fullPath);
      }
    }

    if (tgzFiles.length === 0) {
      throw new Error(`No .tgz packages found in ${packagesPath}`);
    }

    let hasFailure: boolean = false;

    await Async.forEachAsync(
      tgzFiles,
      async (tgzPath: string) => {
        terminal.writeLine(`Verifying package: ${tgzPath}`);

        let packageInfo: IPackageJson;
        try {
          packageInfo = await readPackageInfoFromTgzAsync(tgzPath);
        } catch (e) {
          terminal.writeErrorLine(`Unable to read package metadata from ${tgzPath}: ${e}`);
          hasFailure = true;
          return;
        }

        const { name: packageName, version: packageVersion } = packageInfo;
        terminal.writeLine(`Package name: ${packageName}`);
        terminal.writeLine(`Package version: ${packageVersion}`);

        let taggedVersion: string | undefined;
        try {
          const queryNpmTagVersionAsync = async (): Promise<string> => {
            const npmProcess: ChildProcess = Executable.spawn('npm', [
              'view',
              `${packageName}@${npmTag}`,
              'version'
            ]);
            const { stdout } = await Executable.waitForExitAsync(npmProcess, {
              encoding: 'utf8',
              throwOnNonZeroExitCode: true,
              throwOnSignal: true
            });
            return stdout.trim();
          };
          taggedVersion = await Async.runWithRetriesAsync({
            action: queryNpmTagVersionAsync,
            maxRetries: 3,
            retryDelayMs: 5000
          });
        } catch (e) {
          terminal.writeErrorLine(`Failed to query npm for ${packageName}@${npmTag}: ${e}`);
          hasFailure = true;
          return;
        }

        if (packageVersion !== taggedVersion) {
          terminal.writeErrorLine(
            `Version mismatch for ${packageName}: expected ${packageVersion} at tag "${npmTag}", found "${taggedVersion}".`
          );
          hasFailure = true;
        } else {
          terminal.writeLine(`Package ${packageName}@${packageVersion} matches "${npmTag}" tag`);
        }
      },
      { concurrency: 5 }
    );

    if (hasFailure) {
      throw new Error('One or more packages failed npm tag verification.');
    }
  }
}
