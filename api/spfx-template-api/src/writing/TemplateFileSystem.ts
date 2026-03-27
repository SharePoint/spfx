// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Represents a single file entry in the in-memory template file system.
 * @public
 */
export interface ITemplateFileEntry {
  /** The file contents as a string (text) or Buffer (binary). */
  readonly contents: string | Buffer;
}

/**
 * An in-memory file system that holds rendered template output.
 * Created by {@link SPFxTemplate.renderAsync} and consumed by {@link SPFxTemplateWriter.writeAsync}.
 * @public
 */
export class TemplateFileSystem {
  private readonly _files: Map<string, ITemplateFileEntry> = new Map<string, ITemplateFileEntry>();

  /**
   * Writes a file to the in-memory file system.
   * @param relativePath - Path relative to the destination directory
   * @param contents - File contents (string for text, Buffer for binary)
   */
  public write(relativePath: string, contents: string | Buffer): void {
    this._files.set(relativePath, { contents });
  }

  /**
   * Reads a file from the in-memory file system.
   * @param relativePath - Path relative to the destination directory
   * @returns The file contents, or undefined if the file does not exist
   */
  public read(relativePath: string): string | Buffer | undefined {
    return this._files.get(relativePath)?.contents;
  }

  /**
   * Returns a read-only view of all files in the file system.
   * Keys are paths relative to the destination directory.
   */
  public get files(): ReadonlyMap<string, ITemplateFileEntry> {
    return this._files;
  }
}
