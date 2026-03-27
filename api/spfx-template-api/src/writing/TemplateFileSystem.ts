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
export interface ITemplateFileSystem {
  /**
   * Writes a file to the in-memory file system.
   * @param relativePath - Path relative to the destination directory
   * @param contents - File contents (string for text, Buffer for binary)
   */
  write(relativePath: string, contents: string | Buffer): void;

  /**
   * Reads a file from the in-memory file system.
   * @param relativePath - Path relative to the destination directory
   * @returns The file contents, or undefined if the file does not exist
   */
  read(relativePath: string): string | Buffer | undefined;

  /**
   * Returns a read-only view of all files in the file system.
   * Keys are paths relative to the destination directory.
   */
  readonly files: ReadonlyMap<string, ITemplateFileEntry>;
}

/**
 * Default implementation of {@link ITemplateFileSystem} backed by a simple Map.
 * @public
 */
export class TemplateFileSystem implements ITemplateFileSystem {
  private readonly _files: Map<string, ITemplateFileEntry> = new Map<string, ITemplateFileEntry>();

  /** {@inheritDoc ITemplateFileSystem.write} */
  public write(relativePath: string, contents: string | Buffer): void {
    this._files.set(relativePath, { contents });
  }

  /** {@inheritDoc ITemplateFileSystem.read} */
  public read(relativePath: string): string | Buffer | undefined {
    return this._files.get(relativePath)?.contents;
  }

  /** {@inheritDoc ITemplateFileSystem.files} */
  public get files(): ReadonlyMap<string, ITemplateFileEntry> {
    return this._files;
  }
}
