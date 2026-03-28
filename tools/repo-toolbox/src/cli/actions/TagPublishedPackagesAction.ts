// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Async, FileSystem, type FolderItem, type IPackageJson } from '@rushstack/node-core-library';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { GitHubClient } from '../../utilities/GitHubClient';
import {
  readChangelogSectionFromTgzAsync,
  readPackageInfoFromTgzAsync
} from '../../utilities/PackageTgzUtilities';

/**
 * Creates GitHub releases (and their associated tags) for each .tgz package in a directory.
 * Tags are formatted as `@scope/package_vX.Y.Z`, matching the rushstack convention.
 * Release notes are populated from the corresponding CHANGELOG.md section in the package.
 */
export class TagPublishedPackagesAction extends CommandLineAction {
  private readonly _terminal: ITerminal;
  private readonly _packagesPathParameter: IRequiredCommandLineStringParameter;
  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'tag-published-packages',
      summary: 'Creates GitHub releases and tags for each .tgz package in a directory.',
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

        const changelogSection: string | undefined = await readChangelogSectionFromTgzAsync(
          tgzPath,
          packageVersion
        );
        if (!changelogSection) {
          throw new Error(`No changelog section found for ${packageName}@${packageVersion} in ${tgzPath}`);
        }

        // Semver prerelease versions contain a hyphen (e.g. 1.0.0-alpha.1)
        const prerelease: boolean = packageVersion.includes('-');

        terminal.writeLine(`Creating release: ${tag} → ${commitSha} (prerelease: ${prerelease})`);
        await gitHubClient.createReleaseAsync({
          tag,
          sha: commitSha,
          name: tag,
          body: changelogSection,
          prerelease
        });
        terminal.writeLine(`Created release: ${tag}`);
      },
      { concurrency: 5 }
    );
  }
}
