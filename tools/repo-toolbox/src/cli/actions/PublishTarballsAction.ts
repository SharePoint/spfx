// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type * as child_process from 'node:child_process';
import * as path from 'node:path';

import { Executable, FileSystem, type FolderItem } from '@rushstack/node-core-library';
import type { ITerminal } from '@rushstack/terminal';
import {
  type IRequiredCommandLineStringParameter,
  type CommandLineFlagParameter,
  CommandLineAction
} from '@rushstack/ts-command-line';
import { RushConfiguration } from '@rushstack/rush-sdk';

const NPM_BIN_NAME: 'npm' = 'npm';

export class PublishTarballsAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _artifactPathParameter: IRequiredCommandLineStringParameter;
  private readonly _npmTokenParameter: IRequiredCommandLineStringParameter;
  private readonly _dryRunParameter: CommandLineFlagParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'publish-tarballs',
      summary: 'Publishes npm package tarballs from a directory.',
      documentation:
        'Finds all .tgz files in the specified directory and publishes them to npm. ' +
        'The NPM_AUTH_TOKEN environment variable must be set.'
    });

    this._terminal = terminal;

    this._artifactPathParameter = this.defineStringParameter({
      parameterLongName: '--artifact-path',
      argumentName: 'PATH',
      description: 'Directory containing .tgz files to publish',
      required: true
    });

    this._npmTokenParameter = this.defineStringParameter({
      parameterLongName: '--npm-token',
      argumentName: 'TOKEN',
      description: 'npm authentication token',
      required: true,
      environmentVariable: 'NPM_AUTH_TOKEN'
    });

    this._dryRunParameter = this.defineFlagParameter({
      parameterLongName: '--dry-run',
      description: 'Perform all steps except actually publishing to npm'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;
    const artifactPath: string = this._artifactPathParameter.value;

    // Resolve the .npmrc-publish config that contains the registry and token placeholder.
    // npm's --userconfig flag points directly at it; the token is passed via the environment.
    const npmToken: string = this._npmTokenParameter.value;
    const dryRun: boolean = this._dryRunParameter.value;

    if (dryRun) {
      terminal.writeLine('*** DRY RUN MODE — packages will not be published ***');
      terminal.writeLine('');
    }

    const rushConfiguration: RushConfiguration = RushConfiguration.loadFromDefaultLocation({
      startingFolder: __dirname
    });

    const npmrcPublishPath: string = `${rushConfiguration.commonRushConfigFolder}/.npmrc-publish`;

    // Find all .tgz files
    const tgzFiles: AsyncIterable<string> = this._findTgzFilesAsync(artifactPath);

    // Publish each package
    let successCount: number = 0;
    let failCount: number = 0;

    for await (const tgzFile of tgzFiles) {
      const fileBasename: string = path.basename(tgzFile);
      const publishArgs: string[] = [
        'publish',
        tgzFile,
        '--access',
        'public',
        '--userconfig',
        npmrcPublishPath
      ];
      terminal.writeLine(`> ${NPM_BIN_NAME} ${publishArgs.join(' ')}`);

      if (dryRun) {
        terminal.writeLine(`[dry-run] Skipped: ${fileBasename}`);
        successCount++;
        terminal.writeLine('');
      } else {
        try {
          const proc: child_process.ChildProcess = Executable.spawn(NPM_BIN_NAME, publishArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            environment: { NPM_AUTH_TOKEN: npmToken }
          });
          const { stdout } = await Executable.waitForExitAsync(proc, {
            encoding: 'utf8',
            throwOnNonZeroExitCode: true,
            throwOnSignal: true
          });
          if (stdout) {
            terminal.writeLine(stdout);
          }

          terminal.writeLine(`Successfully published: ${fileBasename}`);
          successCount++;
        } catch (error) {
          terminal.writeErrorLine(`Failed to publish: ${fileBasename}`);
          terminal.writeErrorLine(String(error));
          failCount++;
        }
        terminal.writeLine('');
      }
    }

    if (successCount === 0 && failCount === 0) {
      terminal.writeWarningLine('No .tgz files found to publish.');
    } else {
      terminal.writeLine(`Published: ${successCount}, Failed: ${failCount}`);
    }

    if (failCount > 0) {
      throw new Error('One or more packages failed to publish.');
    }
  }

  private async *_findTgzFilesAsync(dir: string): AsyncIterable<string> {
    const folderItems: FolderItem[] = await FileSystem.readFolderItemsAsync(dir);
    for (const entry of folderItems) {
      const fullPath: string = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        yield* this._findTgzFilesAsync(fullPath);
      } else if (fullPath.endsWith('.tgz')) {
        yield fullPath;
      }
    }
  }
}
