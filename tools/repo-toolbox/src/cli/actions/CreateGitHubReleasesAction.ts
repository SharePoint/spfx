// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { OctokitResponse, RequestError } from '@octokit/types';

import type { ITerminal } from '@rushstack/terminal';
import type { IRequiredCommandLineStringParameter } from '@rushstack/ts-command-line';
import { Async, FileSystem, type FolderItem, type IPackageJson } from '@rushstack/node-core-library';

import {
  GitHubClient,
  type IGitHubAuthorizationHeader,
  parseGitHubAuthorizationHeader
} from '../../utilities/GitHubClient';
import {
  readChangelogSectionFromTgzAsync,
  readPackageInfoFromTgzAsync
} from '../../utilities/PackageTgzUtilities';
import { GitHubTokenActionBase } from './GitHubTokenActionBase';

/**
 * Creates GitHub releases (and their associated tags) for each .tgz package in a directory.
 * Tags are formatted as `@scope/package_vX.Y.Z`, matching the rushstack convention.
 * Release notes are populated from the corresponding CHANGELOG.md section in the package.
 */
export class CreateGitHubReleasesAction extends GitHubTokenActionBase<true> {
  private readonly _terminal: ITerminal;
  private readonly _packagesPathParameter: IRequiredCommandLineStringParameter;
  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;
  private readonly _repoSlugParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'create-github-releases',
      summary: 'Creates a GitHub release for each .tgz package in a directory.',
      documentation:
        'Creates a GitHub release and tag for each .tgz file in the specified directory. Tags are ' +
        'formatted as @scope/package_vX.Y.Z. Release notes are sourced from the package CHANGELOG.md. ' +
        'Versions with a pre-release suffix (e.g. -alpha.1) are marked as GitHub pre-releases. ' +
        'Packages whose release already exists are skipped.',
      githubTokenRequired: true
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

    this._repoSlugParameter = this.defineStringParameter({
      parameterLongName: '--repo-slug',
      argumentName: 'SLUG',
      description: 'GitHub repository slug in the form owner/repo.',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const { RequestError } = await import('@octokit/request-error');
    const terminal: ITerminal = this._terminal;
    const packagesPath: string = this._packagesPathParameter.value;
    const commitSha: string = this._commitShaParameter.value;
    const rawAuthorizationHeader: string = this._githubTokenParameter.value;
    const repoSlug: string = this._repoSlugParameter.value;

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

    const authorizationHeader: IGitHubAuthorizationHeader =
      parseGitHubAuthorizationHeader(rawAuthorizationHeader);
    const gitHubClient: GitHubClient = await GitHubClient.createGitHubClientFromTokenAndRepoSlugAsync({
      authorizationHeader,
      repoSlug
    });

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
          terminal.writeWarningLine(
            `No changelog section found for ${packageName}@${packageVersion}; creating release without body.`
          );
        }

        // Semver prerelease versions contain a hyphen (e.g. 1.0.0-alpha.1)
        const prerelease: boolean = packageVersion.includes('-');

        terminal.writeLine(`Creating release: ${tag} → ${commitSha} (prerelease: ${prerelease})`);
        try {
          await gitHubClient.createReleaseAsync({
            tag,
            sha: commitSha,
            name: tag,
            body: changelogSection,
            prerelease
          });
          terminal.writeLine(`Created release: ${tag}`);
        } catch (e: unknown) {
          if (e instanceof RequestError) {
            const { status, message, response } = e;
            const responseData: RequestError | undefined = (
              response as OctokitResponse<RequestError> | undefined
            )?.data;
            const responseErrors: RequestError['errors'] = responseData?.errors;

            if (
              status === 422 &&
              Array.isArray(responseErrors) &&
              responseErrors.some((error) => error.code === 'already_exists')
            ) {
              terminal.writeLine(`Release already exists for ${tag}; skipping.`);
              return;
            } else {
              // Newlines break the single-line ##vso logging command format.
              const sanitizedMessage: string = message.replace(/[\r\n]+/g, ' ');
              terminal.writeLine(
                `##vso[task.logissue type=error]GitHub API error creating release ${tag}: ` +
                  `HTTP ${status} — ${sanitizedMessage}. ` +
                  (responseData ? `response data: ${JSON.stringify(responseData)}` : '')
              );
            }
          }

          throw e;
        }
      },
      { concurrency: 5 }
    );
  }
}
