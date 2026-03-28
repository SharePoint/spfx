// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Async, FileSystem, type FolderItem, type IPackageJson } from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { GitHubClient } from '../../utilities/GitHubClient';
import { readPackageInfoFromTgzAsync } from '../../utilities/PackageTgzUtilities';

/**
 * Creates GitHub tags for each .tgz package in a directory.
 * Tags are formatted as `@scope/package_vX.Y.Z`, matching the rushstack convention.
 */
export class TagPublishedPackagesAction extends CommandLineAction {
  private readonly _terminal: ITerminal;
  private readonly _packagesPathParameter: IRequiredCommandLineStringParameter;
  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'tag-published-packages',
      summary: 'Creates GitHub tags for each .tgz package in a directory.',
      documentation: ''
    });

    this._terminal = terminal;
    this._packagesPathParameter = this.defineStringParameter({
      parameterLongName: '--packages-path',
      argumentName: 'PATH',
      description: 'Path to directory containing .tgz package files.',
      required: true
    });
    this._commitShaParameter = this.defineStringParameter({
      parameterLongName: '--commit-sha',
      argumentName: 'SHA',
      description: 'The commit SHA to tag.',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;
    const packagesPath: string = this._packagesPathParameter.value;
    const commitSha: string = this._commitShaParameter.value;

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

    const gitHubClient: GitHubClient = await GitHubClient.createGitHubClientAsync(terminal);

    await Async.forEachAsync(
      tgzFiles,
      async (tgzPath: string) => {
        const packageJson: IPackageJson = await readPackageInfoFromTgzAsync(tgzPath);
        const { name: packageName, version: packageVersion } = packageJson;
        const tag: string = `${packageName}_v${packageVersion}`;
        terminal.writeLine(`Creating tag: ${tag} → ${commitSha}`);
        await gitHubClient.createTagAsync({ tag, sha: commitSha });
        terminal.writeLine(`Created tag: ${tag}`);
      },
      { concurrency: 5 }
    );
  }
}
