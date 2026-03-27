// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { readFile } from 'node:fs/promises';

import type { MemFsEditor } from 'mem-fs-editor';

import type { IMergeHelper } from './IMergeHelper';
import { PackageJsonMergeHelper } from './PackageJsonMergeHelper';
import { ConfigJsonMergeHelper } from './ConfigJsonMergeHelper';
import { PackageSolutionJsonMergeHelper } from './PackageSolutionJsonMergeHelper';
import { ServeJsonMergeHelper } from './ServeJsonMergeHelper';
import type { SPFxScaffoldLog } from '../logging/SPFxScaffoldLog';
import type { FileWriteOutcome } from '../logging/SPFxScaffoldEvent';

interface IDumpEntry {
  // eslint-disable-next-line @rushstack/no-new-null
  contents: string | null;
  state?: string;
}

/**
 * Options for {@link SPFxTemplateWriter.writeAsync}.
 *
 * @public
 */
export interface IWriteOptions {
  /**
   * When provided, a `file-write` event is appended for every file processed
   * during the write phase.
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
   * @param editor - The MemFsEditor containing rendered template files
   * @param targetDir - The absolute path to the destination directory
   * @param options - Optional settings including a scaffold log to record file outcomes
   */
  public async writeAsync(editor: MemFsEditor, targetDir: string, options?: IWriteOptions): Promise<void> {
    const log: SPFxScaffoldLog | undefined = options?.log;

    // editor.dump(targetDir) returns keys as paths relative to targetDir
    const dump: Record<string, IDumpEntry> = editor.dump(targetDir);

    for (const [rawPath, entry] of Object.entries(dump)) {
      // Normalize Windows backslash separators so merge-helper lookup works cross-platform
      const relativePath: string = rawPath.replace(/\\/g, '/');
      if (entry.state === 'deleted') {
        continue;
      }

      if (entry.contents === null) {
        continue;
      }

      const absolutePath: string = `${targetDir}/${relativePath}`;

      let existingContent: string;
      try {
        existingContent = await readFile(absolutePath, 'utf-8');
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File does not exist — new file, let commit write it as-is
          _logFileWrite(log, relativePath, 'new');
          continue;
        }
        throw error;
      }

      // File already exists on disk — attempt merge if content differs
      if (existingContent === entry.contents) {
        _logFileWrite(log, relativePath, 'unchanged');
        continue;
      }

      const helper: IMergeHelper | undefined = this._mergeHelpers.get(relativePath);
      if (helper) {
        const mergedContent: string = helper.merge(existingContent, entry.contents);
        editor.write(absolutePath, mergedContent);
        _logFileWrite(log, relativePath, 'merged', helper.fileRelativePath);
      } else {
        // No merge helper and content differs — preserve the existing version
        // by writing it into the editor so commit() does not overwrite it.
        editor.write(absolutePath, existingContent);
        _logFileWrite(log, relativePath, 'preserved');
      }
    }

    await editor.commit();
  }
}
