// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Represents a single file entry in the template output.
 * @public
 */
export interface ITemplateOutputEntry {
  /** The file contents as a string (text) or Buffer (binary). */
  readonly contents: string | Buffer;
}

/**
 * Holds the rendered output of an SPFx template as an in-memory collection of files.
 * Created by {@link SPFxTemplate.renderAsync} and consumed by {@link SPFxTemplateWriter.writeAsync}.
 * @public
 */
export class TemplateOutput {
  private readonly _files: Map<string, ITemplateOutputEntry> = new Map<string, ITemplateOutputEntry>();

  /**
   * Adds a file to the template output.
   * @param relativePath - Path relative to the destination directory
   * @param contents - File contents (string for text, Buffer for binary)
   */
  public write(relativePath: string, contents: string | Buffer): void {
    this._files.set(relativePath, { contents });
  }

  /**
   * Reads a file from the template output.
   * @param relativePath - Path relative to the destination directory
   * @returns The file contents, or undefined if the file does not exist
   */
  public read(relativePath: string): string | Buffer | undefined {
    return this._files.get(relativePath)?.contents;
  }

  /**
   * Returns a read-only view of all files in the output.
   * Keys are paths relative to the destination directory.
   */
  public get files(): ReadonlyMap<string, ITemplateOutputEntry> {
    return this._files;
  }
}
