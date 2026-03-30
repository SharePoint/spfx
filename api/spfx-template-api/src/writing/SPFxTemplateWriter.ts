// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';

import { FileSystem } from '@rushstack/node-core-library';

import type { TemplateFileSystem } from './TemplateFileSystem';
import type { IMergeHelper } from './IMergeHelper';
import { PackageJsonMergeHelper } from './PackageJsonMergeHelper';
import { ConfigJsonMergeHelper } from './ConfigJsonMergeHelper';
import { PackageSolutionJsonMergeHelper } from './PackageSolutionJsonMergeHelper';
import { ServeJsonMergeHelper } from './ServeJsonMergeHelper';

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
   * @param templateFs - The in-memory file system containing rendered template files
   * @param targetDir - The absolute path to the destination directory
   */
  public async writeAsync(templateFs: TemplateFileSystem, targetDir: string): Promise<void> {
    const resolvedTargetDir: string = path.resolve(targetDir);

    for (const [rawRelativePath, entry] of templateFs.files) {
      // Normalize: strip leading separators and convert backslashes to forward slashes
      const relativePath: string = rawRelativePath.replace(/\\/g, '/').replace(/^\/+/, '');

      // Guard against path traversal: resolve the full path and verify it stays under targetDir
      const absolutePath: string = path.resolve(resolvedTargetDir, relativePath);
      const relativeToTarget: string = path.relative(resolvedTargetDir, absolutePath);
      if (
        path.isAbsolute(relativeToTarget) ||
        relativeToTarget === '..' ||
        relativeToTarget.startsWith('..' + path.sep)
      ) {
        throw new Error(`Template path "${rawRelativePath}" escapes the target directory`);
      }

      const contents: string | Buffer = entry.contents;

      if (typeof contents !== 'string') {
        // Binary file — skip if identical file already exists on disk
        try {
          const existingBuffer: Buffer = await FileSystem.readFileToBufferAsync(absolutePath);
          if (existingBuffer.equals(contents)) {
            continue;
          }
        } catch (error: unknown) {
          if (!FileSystem.isNotExistError(error as Error)) {
            throw error;
          }
        }
        await FileSystem.ensureFolderAsync(path.dirname(absolutePath));
        await FileSystem.writeFileAsync(absolutePath, contents);
        continue;
      }

      // Text file — attempt merge with existing content on disk
      let existingContent: string;
      try {
        existingContent = await FileSystem.readFileAsync(absolutePath);
      } catch (error: unknown) {
        if (!FileSystem.isNotExistError(error as Error)) {
          throw error;
        }
        // File does not exist on disk — write as new file
        await FileSystem.ensureFolderAsync(path.dirname(absolutePath));
        await FileSystem.writeFileAsync(absolutePath, contents);
        continue;
      }

      // File exists on disk — check if content differs
      if (existingContent === contents) {
        continue;
      }

      const helper: IMergeHelper | undefined = this._mergeHelpers.get(relativePath);
      if (helper) {
        const mergedContent: string = helper.merge(existingContent, contents);
        await FileSystem.ensureFolderAsync(path.dirname(absolutePath));
        await FileSystem.writeFileAsync(absolutePath, mergedContent);
      }
      // No merge helper and content differs — preserve existing content (skip writing)
    }
  }
}
