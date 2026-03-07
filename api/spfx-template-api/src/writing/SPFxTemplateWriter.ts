// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { MemFsEditor } from 'mem-fs-editor';
import type { Terminal } from '@rushstack/terminal';

import { BaseMergeHelper } from './BaseMergeHelper';
import { PackageJsonMergeHelper } from './PackageJsonMergeHelper';
import { ConfigJsonMergeHelper } from './ConfigJsonMergeHelper';
import { PackageSolutionJsonMergeHelper } from './PackageSolutionJsonMergeHelper';
import { ServeJsonMergeHelper } from './ServeJsonMergeHelper';

interface IDumpEntry {
  contents: string | null;
  state?: string;
}

/**
 * Orchestrates writing template output to disk, routing modified files
 * through specialized merge helpers so that config files are intelligently
 * merged instead of overwritten.
 *
 * @public
 */
export class SPFxTemplateWriter {
  private readonly _terminal: Terminal;
  private readonly _mergeHelpers: Map<string, BaseMergeHelper>;

  public constructor(terminal: Terminal) {
    this._terminal = terminal;
    this._mergeHelpers = new Map<string, BaseMergeHelper>();

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
  public addMergeHelper(helper: BaseMergeHelper): void {
    this._mergeHelpers.set(helper.fileRelativePath, helper);
  }

  /**
   * Writes template output to disk. Files that already exist on disk are
   * routed through their corresponding merge helper (if one is registered).
   * New files are written directly.
   *
   * @param editor - The MemFsEditor containing rendered template files
   * @param targetDir - The absolute path to the destination directory
   */
  public async writeAsync(editor: MemFsEditor, targetDir: string): Promise<void> {
    const dump: Record<string, IDumpEntry> = editor.dump(targetDir);

    for (const [relativePath, entry] of Object.entries(dump)) {
      if (entry.state === 'deleted') {
        continue;
      }

      const absolutePath: string = path.join(targetDir, relativePath);

      if (!fs.existsSync(absolutePath)) {
        // New file — let commit write it as-is
        continue;
      }

      // File already exists on disk — attempt merge
      if (entry.contents === null) {
        continue;
      }

      const helper: BaseMergeHelper | undefined = this._mergeHelpers.get(relativePath);
      if (helper) {
        const existingContent: string = fs.readFileSync(absolutePath, 'utf-8');
        const mergedContent: string = helper.merge(existingContent, entry.contents);
        editor.write(absolutePath, mergedContent);
      } else {
        this._terminal.writeWarningLine(
          `No merge helper registered for modified file: ${relativePath}. File will be overwritten.`
        );
      }
    }

    await editor.commit();
  }
}
