// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

import type { ITemplateFileSystem } from './TemplateFileSystem';
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
  public async writeAsync(templateFs: ITemplateFileSystem, targetDir: string): Promise<void> {
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
        // Binary file — always write directly
        const dirPath: string = path.dirname(absolutePath);
        await mkdir(dirPath, { recursive: true });
        await writeFile(absolutePath, contents);
        continue;
      }

      // Text file — attempt merge with existing content on disk
      let existingContent: string;
      try {
        existingContent = await readFile(absolutePath, 'utf-8');
      } catch (error: unknown) {
        // Only treat ENOENT (file not found) as "new file" — rethrow anything else
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.code !== 'ENOENT') {
          throw error;
        }
        // File does not exist on disk — write as new file
        const dirPath: string = path.dirname(absolutePath);
        await mkdir(dirPath, { recursive: true });
        await writeFile(absolutePath, contents, 'utf-8');
        continue;
      }

      // File exists on disk — check if content differs
      if (existingContent === contents) {
        continue;
      }

      const helper: IMergeHelper | undefined = this._mergeHelpers.get(relativePath);
      if (helper) {
        const mergedContent: string = helper.merge(existingContent, contents);
        const dirPath: string = path.dirname(absolutePath);
        await mkdir(dirPath, { recursive: true });
        await writeFile(absolutePath, mergedContent, 'utf-8');
      }
      // No merge helper and content differs — preserve existing content (skip writing)
    }
  }
}
