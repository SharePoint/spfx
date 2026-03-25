// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { MemFsEditor } from 'mem-fs-editor';
import * as ejs from 'ejs';
import * as z from 'zod';

import { Async, FileSystem, type IPackageJson, type FolderItem } from '@rushstack/node-core-library';

import {
  SPFxTemplateJsonFile,
  SPFxTemplateDefinitionSchema,
  type ISPFxTemplateJson,
  type SPFxTemplateCategory
} from './SPFxTemplateJsonFile';
import { isBinaryFile } from './binaryFiles';

/**
 * @public
 */
export interface IRenderOptions {
  /**
   * If true, any scripts in package.json whose names start with "_phase:" will be retained in
   * the rendered output. This is useful for CI environments where these scripts are used
   * for building the templates repo, but aren't used in the actual generated projects and would
   * just add noise if left in. By default, these scripts are stripped out during rendering.
   */
  retainPhaseScripts?: boolean;
}

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template, which can be rendered.
 */
export class SPFxTemplate {
  private readonly _definition: SPFxTemplateJsonFile;
  private readonly _files: Map<string, string | Buffer>;

  public constructor(definition: SPFxTemplateJsonFile, files: Map<string, string | Buffer>) {
    this._definition = definition;
    this._files = files;
  }

  /**
   * Gets the name of the template.
   */
  public get name(): string {
    return this._definition.name;
  }

  /**
   * Gets the category of the template.
   */
  public get category(): SPFxTemplateCategory {
    return this._definition.category;
  }

  /**
   * Gets the description of the template.
   */
  public get description(): string | undefined {
    return this._definition.description;
  }

  /**
   * Gets the version of the template as a string.
   * This is a semver "X.Y.Z" string; pre-release and build metadata are not supported.
   */
  public get version(): string {
    return this._definition.version;
  }

  /**
   * Gets the SPFx version this template is compatible with.
   */
  public get spfxVersion(): string {
    return this._definition.spfxVersion;
  }

  /**
   * Gets the number of files in the template.
   */
  public get fileCount(): number {
    return this._files.size;
  }

  /**
   * Creates a new SPFxTemplate instance from a folder on disk.
   * @param folderPath - The path to the folder containing the template files
   * @returns A Promise that resolves to a new SPFxTemplate instance
   */
  public static async fromFolderAsync(folderPath: string): Promise<SPFxTemplate> {
    const templateJsonFile: SPFxTemplateJsonFile = await SPFxTemplateJsonFile.fromFolderAsync(folderPath);
    const files: Map<string, string | Buffer> = await SPFxTemplate._readFilesRecursivelyAsync(folderPath);
    return new SPFxTemplate(templateJsonFile, files);
  }

  /**
   * Creates a new SPFxTemplate instance from in-memory data.
   * @param templateName - The name of the template
   * @param templateJsonData - The template.json data as an unknown object to be validated
   * @param fileMap - A map of file paths to their buffer contents
   * @returns A Promise that resolves to a new SPFxTemplate instance
   */
  public static async fromMemoryAsync(
    templateName: string,
    templateJsonData: unknown,
    fileMap: Map<string, Buffer>
  ): Promise<SPFxTemplate> {
    // Validate the template JSON against our schema
    const result: z.ZodSafeParseResult<ISPFxTemplateJson> =
      SPFxTemplateDefinitionSchema.safeParse(templateJsonData);
    if (!result.success) {
      throw new Error(`Invalid template.json: ${result.error}`);
    }

    // Create SPFxTemplateJsonFile from the validated JSON
    const templateJsonFile: SPFxTemplateJsonFile = new SPFxTemplateJsonFile(result.data);

    // Copy all files except template.json, storing text files as strings for EJS processing
    const files: Map<string, string | Buffer> = new Map<string, string | Buffer>();
    for (const [filePath, buffer] of fileMap) {
      if (filePath !== 'template.json') {
        if (isBinaryFile(filePath)) {
          files.set(filePath, buffer);
        } else {
          files.set(filePath, buffer.toString('utf8'));
        }
      }
    }

    return new SPFxTemplate(templateJsonFile, files);
  }

  private static async _readFilesRecursivelyAsync(baseDir: string): Promise<Map<string, string | Buffer>> {
    const files: Map<string, string | Buffer> = new Map<string, string | Buffer>();
    const frontier: string[] = [''];

    while (frontier.length > 0) {
      const currentSubDir: string = frontier.pop()!;
      const folderPath: string = `${baseDir}/${currentSubDir}`;
      const items: FolderItem[] = await FileSystem.readFolderItemsAsync(folderPath);

      await Async.forEachAsync(
        items,
        async (item) => {
          const itemName: string = item.name;
          const itemRelativePath: string = `${currentSubDir}/${itemName}`;
          // Ignore the "template.json" in the root
          if (currentSubDir === '' && itemName === SPFxTemplateJsonFile.TEMPLATE_JSON) {
            return;
          }

          if (item.isFile()) {
            const fullPath: string = `${folderPath}/${itemName}`;
            const fileIsBinary: boolean = await isBinaryFile(itemName);
            let itemContents: string | Buffer;
            if (fileIsBinary) {
              itemContents = await FileSystem.readFileToBufferAsync(fullPath);
            } else {
              itemContents = await FileSystem.readFileAsync(fullPath);
            }

            files.set(itemRelativePath, itemContents);
          } else if (item.isDirectory()) {
            frontier.push(itemRelativePath);
          } else {
            throw new Error(`Unexpected item type at ${itemRelativePath}`);
          }
        },
        { concurrency: 50 }
      );
    }

    return files;
  }

  /**
   * Renders the template with the provided context object and writes to a destination directory.
   * @param context - The context object containing variables to be used in template rendering
   * @param destinationDir - The destination directory where rendered files will be written
   * @returns A Promise that resolves to a MemFsEditor instance containing the rendered files
   */
  public async renderAsync(
    context: object,
    destinationDir: string,
    options?: IRenderOptions
  ): Promise<MemFsEditor> {
    // use the template "schema" to validate the context object
    if (this._definition.contextSchema) {
      // Build a Zod schema from the contextSchema metadata
      const schemaShape: Record<string, z.ZodString> = {};
      for (const [key, value] of Object.entries(this._definition.contextSchema)) {
        if (value.type === 'string') {
          schemaShape[key] = z.string();
        }
      }

      const contextSchema: z.ZodObject<Record<string, z.ZodString>> = z.object(schemaShape);
      const validationResult: z.ZodSafeParseResult<Record<string, string>> = contextSchema.safeParse(context);
      if (!validationResult.success) {
        throw new Error(`Invalid context object: ${validationResult.error}`);
      }
    }

    const { create: createMemFs } = await import('mem-fs');
    const { create: createEditor } = await import('mem-fs-editor');
    const memFs: MemFsEditor = createEditor(createMemFs());

    for (const [filename, contents] of this._files) {
      // Render the filename by replacing {variableName} placeholders
      let renderedFilename: string = filename;
      for (const [key, value] of Object.entries(context)) {
        const placeholder: string = `{${key}}`;
        renderedFilename = renderedFilename.split(placeholder).join(String(value));
      }

      const destination: string = `${destinationDir}/${renderedFilename}`;
      if (typeof contents === 'string') {
        // Process text file contents as EJS template
        let rendered: string = ejs.render(contents, context, {
          filename,
          cache: false
        });

        if (!options?.retainPhaseScripts && renderedFilename.endsWith('/package.json')) {
          rendered = _stripPhaseScripts(rendered);
        }

        memFs.write(destination, rendered);
      } else {
        // Binary files are written as-is without EJS processing
        memFs.write(destination, contents);
      }
    }

    return memFs;
  }

  /**
   * Returns a string representation of the template including its metadata.
   * @returns A formatted string with template details
   */
  public toString(): string {
    return [
      `Template Name: ${this.name}`,
      `Category: ${this.category}`,
      `Description: ${this.description || 'N/A'}`,
      `Version: ${this.version}`,
      `SPFx Version: ${this.spfxVersion}`,
      `Files: ${this.fileCount}`
    ].join('\n');
  }
}

function _stripPhaseScripts(packageJsonContents: string): string {
  const parsed: IPackageJson = JSON.parse(packageJsonContents);

  if (!parsed.scripts) {
    return packageJsonContents;
  }

  let modified: boolean = false;
  for (const key of Object.keys(parsed.scripts)) {
    if (key.startsWith('_phase:')) {
      delete parsed.scripts[key];
      modified = true;
    }
  }

  return modified ? JSON.stringify(parsed, undefined, 2) + '\n' : packageJsonContents;
}
