// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as ejs from 'ejs';
import * as z from 'zod';

import { Async, FileSystem, Path, type IPackageJson, type FolderItem } from '@rushstack/node-core-library';

import {
  SPFxTemplateJsonFile,
  SPFxTemplateDefinitionSchema,
  type ISPFxTemplateJson,
  type SPFxTemplateCategory
} from './SPFxTemplateJsonFile';
import { createCasedString, type ICasedString } from './CasedString';
import { isBinaryFile } from './binaryFiles';
import { TemplateOutput } from '../writing/TemplateOutput';

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
   * Must be a valid semver string (e.g. "1.0.0"). Pre-release and build metadata are permitted.
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
   * Gets the minimum engine version required to process this template.
   * Returns undefined if no minimum is specified.
   */
  public get minimumEngineVersion(): string | undefined {
    return this._definition.minimumEngineVersion;
  }

  /**
   * Gets the list of field names in template.json that are not recognized by this
   * version of the engine.
   */
  public get unknownFields(): readonly string[] {
    return this._definition.unknownFields;
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
   * Renders the template with the provided context object.
   * @param context - The context object containing variables to be used in template rendering
   * @param options - Optional render options
   * @returns A Promise that resolves to a TemplateOutput containing the rendered files
   */
  public async renderAsync(context: object, options?: IRenderOptions): Promise<TemplateOutput> {
    // Validate the context object against the template's contextSchema (if declared).
    // Validation runs on the raw (pre-wrap) context so schema types remain simple strings.
    if (this._definition.contextSchema) {
      const schemaShape: Record<string, z.ZodString> = {};
      for (const [key, value] of Object.entries(this._definition.contextSchema)) {
        if (value.type === 'string') {
          schemaShape[key] = z.string();
        }
      }

      const contextSchema: z.ZodObject<Record<string, z.ZodString>> = z.object(schemaShape).passthrough();
      const validationResult: z.ZodSafeParseResult<Record<string, string>> = contextSchema.safeParse(context);
      if (!validationResult.success) {
        throw new Error(`Invalid context object: ${validationResult.error}`);
      }
    }

    // Wrap every plain-string value in the context with ICasedString so templates
    // can access casing variants (e.g. <%= componentName.pascal %>) for free.
    // Also pre-compute a flat list of dotted-key -> string entries for filename
    // placeholder replacement (e.g. {componentName.pascal} -> "HelloWorld").
    const { ejsContext, flatEntries } = _buildRenderContext(context);

    const templateFs: TemplateOutput = new TemplateOutput();

    for (const [filename, contents] of this._files) {
      // Render the filename by replacing {key} and {key.property} placeholders
      let renderedFilename: string = filename;
      for (const [dottedKey, value] of flatEntries) {
        const placeholder: string = `{${dottedKey}}`;
        renderedFilename = renderedFilename.split(placeholder).join(value);
      }
      // Normalize to relative POSIX path: convert backslashes and strip leading slashes
      renderedFilename = Path.convertToSlashes(renderedFilename).replace(/^\/+/, '');

      if (typeof contents === 'string') {
        // Process text file contents as EJS template
        let rendered: string = ejs.render(contents, ejsContext, {
          filename,
          cache: false
        });

        if (
          !options?.retainPhaseScripts &&
          (renderedFilename === 'package.json' || renderedFilename.endsWith('/package.json'))
        ) {
          rendered = _stripPhaseScripts(rendered);
        }

        templateFs.write(renderedFilename, rendered);
      } else {
        // Binary files are written as-is without EJS processing
        templateFs.write(renderedFilename, contents);
      }
    }

    return templateFs;
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

/**
 * Builds both the EJS render context and the flat filename-placeholder entries in a
 * single pass. Every plain-string value is wrapped with {@link createCasedString};
 * non-string values are passed through unchanged. Flat entries include dotted sub-keys
 * for each casing variant so that `{componentName.pascal}` resolves in filenames.
 */
function _buildRenderContext(context: object): {
  ejsContext: Record<string, unknown>;
  flatEntries: Map<string, string>;
} {
  const ejsContext: Record<string, unknown> = {};
  const flatEntries: Map<string, string> = new Map<string, string>();

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      const cased: ICasedString = createCasedString(value);
      ejsContext[key] = cased;
      const { camel, pascal, hyphen, allCaps } = cased;
      flatEntries.set(key, value);
      flatEntries.set(`${key}.camel`, camel);
      flatEntries.set(`${key}.pascal`, pascal);
      flatEntries.set(`${key}.hyphen`, hyphen);
      flatEntries.set(`${key}.allCaps`, allCaps);
    } else {
      ejsContext[key] = value;
      flatEntries.set(key, String(value));
    }
  }

  return { ejsContext, flatEntries };
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
