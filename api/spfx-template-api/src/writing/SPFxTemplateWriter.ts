// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import path from 'node:path';

import { Async, FileSystem, Path } from '@rushstack/node-core-library';

import type { TemplateOutput } from './TemplateOutput';
import type { IMergeHelper } from './IMergeHelper';
import { PackageJsonMergeHelper } from './PackageJsonMergeHelper';
import { ConfigJsonMergeHelper } from './ConfigJsonMergeHelper';
import { PackageSolutionJsonMergeHelper } from './PackageSolutionJsonMergeHelper';
import { ServeJsonMergeHelper } from './ServeJsonMergeHelper';
import type { SPFxScaffoldLog } from '../logging/SPFxScaffoldLog';
import type { FileWriteOutcome } from '../logging/SPFxScaffoldEvent';

/**
 * Options for {@link SPFxTemplateWriter.writeAsync}.
 *
 * @public
 */
export interface IWriteOptions {
  /**
   * When provided, a `file-write` event is appended for each file in the template
   * output that is evaluated for writing or merging during the write phase.
   */
  log?: SPFxScaffoldLog;
}

function _logFileWrite(
  log: SPFxScaffoldLog | undefined,
  relativePath: string,
  outcome: FileWriteOutcome,
  mergeHelper?: string
): void {
  log?.append({
    kind: 'file-write',
    relativePath,
    outcome,
    mergeHelper
  });
}

/**
 * Orchestrates writing template output to disk, routing modified files
 * through specialized merge helpers so that config files are intelligently
 * merged instead of overwritten.
 *
 * @public
 */
export class SPFxTemplateWriter {
  private readonly _mergeHelpers: Map<string, IMergeHelper>;

  public constructor() {
    this._mergeHelpers = new Map<string, IMergeHelper>();

    // Register built-in helpers
    this.addMergeHelper(new PackageJsonMergeHelper());
    this.addMergeHelper(new ConfigJsonMergeHelper());
    this.addMergeHelper(new PackageSolutionJsonMergeHelper());
    this.addMergeHelper(new ServeJsonMergeHelper());
  }

  /**
   * Registers a merge helper. If a helper for the same path already exists,
   * it is replaced.
   */
  public addMergeHelper(helper: IMergeHelper): void {
    this._mergeHelpers.set(helper.fileRelativePath, helper);
  }

  /**
   * Writes template output to disk. Files that already exist on disk are
   * routed through their corresponding merge helper (if one is registered).
   * New files are written directly.
   *
   * @param templateOutput - The rendered template output containing files to write
   * @param targetDir - The absolute path to the destination directory
   * @param options - Optional settings including a scaffold log to record file outcomes
   */
  public async writeAsync(
    templateOutput: TemplateOutput,
    targetDir: string,
    options?: IWriteOptions
  ): Promise<void> {
    const resolvedTargetDir: string = Path.convertToSlashes(path.resolve(targetDir));
    const log: SPFxScaffoldLog | undefined = options?.log;

    await Async.forEachAsync(
      templateOutput.files,
      async ([rawRelativePath, entry]) => {
        const relativePath: string = Path.convertToSlashes(rawRelativePath).replace(/^\/+/, '');

        // Guard against path traversal
        const absolutePath: string = Path.convertToSlashes(path.resolve(targetDir, relativePath));
        if (!absolutePath.startsWith(resolvedTargetDir + '/')) {
          throw new Error(`Template path "${rawRelativePath}" escapes the target directory`);
        }

        await this._writeFileAsync(relativePath, absolutePath, entry.contents, log);
      },
      { concurrency: 50 }
    );
  }

  private async _writeFileAsync(
    relativePath: string,
    absolutePath: string,
    contents: string | Buffer,
    log?: SPFxScaffoldLog
  ): Promise<void> {
    let contentToWrite: string | Buffer | undefined;
    if (typeof contents !== 'string') {
      // Binary file — skip if identical file already exists on disk
      let existingBuffer: Buffer | undefined;
      try {
        existingBuffer = await FileSystem.readFileToBufferAsync(absolutePath);
      } catch (error) {
        if (!FileSystem.isNotExistError(error)) {
          throw error;
        }
      }

      if (existingBuffer === undefined) {
        contentToWrite = contents;
        _logFileWrite(log, relativePath, 'new');
      } else if (!existingBuffer.equals(contents)) {
        contentToWrite = contents;
        _logFileWrite(log, relativePath, 'new');
      } else {
        _logFileWrite(log, relativePath, 'unchanged');
      }
    } else {
      // Text file — attempt merge with existing content on disk
      let existingContent: string | undefined;
      try {
        existingContent = await FileSystem.readFileAsync(absolutePath);
      } catch (error) {
        if (!FileSystem.isNotExistError(error)) {
          throw error;
        }
      }

      if (existingContent === undefined) {
        contentToWrite = contents;
        _logFileWrite(log, relativePath, 'new');
      } else if (existingContent !== contents) {
        const helper: IMergeHelper | undefined = this._mergeHelpers.get(relativePath);
        if (helper) {
          contentToWrite = helper.merge(existingContent, contents);
          _logFileWrite(log, relativePath, 'merged', helper.fileRelativePath);
        } else {
          // No merge helper and content differs — preserve existing content (skip writing)
          _logFileWrite(log, relativePath, 'preserved');
        }
      } else {
        _logFileWrite(log, relativePath, 'unchanged');
      }
    }

    if (contentToWrite !== undefined) {
      await FileSystem.writeFileAsync(absolutePath, contentToWrite, { ensureFolderExists: true });
    }
  }
}
