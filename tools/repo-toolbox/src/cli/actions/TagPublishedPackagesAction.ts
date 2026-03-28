// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Executable, FileSystem, type FolderItem, type IPackageJson } from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { readPackageInfoFromTgzAsync } from '../../utilities/PackageTgzUtilities';

/**
 * Creates and pushes a Git tag for each .tgz package in a directory.
 * Tags are formatted as `@scope/package_vX.Y.Z`, matching the rushstack convention.
 */
export class TagPublishedPackagesAction extends CommandLineAction {
  private readonly _terminal: ITerminal;
  private readonly _packagesPathParameter: IRequiredCommandLineStringParameter;
  private readonly _gitRemoteParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'tag-published-packages',
      summary: 'Creates and pushes a Git tag for each .tgz package in a directory.',
      documentation: ''
    });

    this._terminal = terminal;
    this._packagesPathParameter = this.defineStringParameter({
      parameterLongName: '--packages-path',
      argumentName: 'PATH',
      description: 'Path to directory containing .tgz package files.',
      required: true
    });
    this._gitRemoteParameter = this.defineStringParameter({
      parameterLongName: '--git-remote',
      argumentName: 'REMOTE',
      description: 'The Git remote to push tags to (e.g., "origin").',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;
    const packagesPath: string = this._packagesPathParameter.value;
    const gitRemote: string = this._gitRemoteParameter.value;

    const folderItems: FolderItem[] = await FileSystem.readFolderItemsAsync(packagesPath);
    const tgzFiles: string[] = [];
    for (const folderItem of folderItems) {
      const folderItemName: string = folderItem.name;
      if (folderItem.isFile() && folderItemName.endsWith('.tgz')) {
        tgzFiles.push(`${packagesPath}/${folderItemName}`);
      }
    }

    if (tgzFiles.length === 0) {
      throw new Error(`No .tgz packages found in ${packagesPath}`);
    }

    const tags: string[] = [];

    for (const tgzPath of tgzFiles) {
      const packageJson: IPackageJson = await readPackageInfoFromTgzAsync(tgzPath);
      const { name: packageName, version: packageVersion } = packageJson;
      const tag: string = `${packageName}_v${packageVersion}`;
      tags.push(tag);
      terminal.writeLine(`Creating tag: ${tag}`);

      const tagProcess: ChildProcess = Executable.spawn('git', ['tag', tag]);
      await Executable.waitForExitAsync(tagProcess, {
        throwOnNonZeroExitCode: true,
        throwOnSignal: true
      });
    }

    terminal.writeLine(`Pushing ${tags.length} tag(s) to remote "${gitRemote}"...`);
    const pushProcess: ChildProcess = Executable.spawn('git', ['push', gitRemote, ...tags]);
    await Executable.waitForExitAsync(pushProcess, {
      throwOnNonZeroExitCode: true,
      throwOnSignal: true
    });

    terminal.writeLine('Tags pushed successfully.');
  }
}
