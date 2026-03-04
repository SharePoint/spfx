import { FileSystem } from '@rushstack/node-core-library';
import * as ejs from 'ejs';
import type { MemFsEditor } from 'mem-fs-editor';
import * as path from 'path';
import * as z from 'zod';

import { SPFxTemplateJsonFile, SPFxTemplateDefinitionSchema } from './SPFxTemplateJsonFile';

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template, which can be rendered.
 */
export class SPFxTemplate {
  private readonly _definition: SPFxTemplateJsonFile;
  private readonly _files: Map<string, string>;

  public constructor(definition: SPFxTemplateJsonFile, files: Map<string, string>) {
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
   * Creates a new SPFxTemplate instance from a folder on disk.
   * @param path - The path to the folder containing the template files
   * @returns A Promise that resolves to a new SPFxTemplate instance
   */
  public static async fromFolderAsync(path: string): Promise<SPFxTemplate> {
    const templateJsonFile: SPFxTemplateJsonFile = await SPFxTemplateJsonFile.fromFolderAsync(path);
    const files = await SPFxTemplate._readFilesRecursively(path);
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
    const result = SPFxTemplateDefinitionSchema.safeParse(templateJsonData);
    if (!result.success) {
      throw new Error(`Invalid template.json: ${result.error}`);
    }

    // Create SPFxTemplateJsonFile from the validated JSON
    const templateJsonFile = new SPFxTemplateJsonFile(result.data);

    // Convert Buffer map to string map, excluding template.json
    const files = new Map<string, string>();
    for (const [filePath, buffer] of fileMap) {
      if (filePath !== 'template.json') {
        files.set(filePath, buffer.toString('utf8'));
      }
    }

    return new SPFxTemplate(templateJsonFile, files);
  }

  private static async _readFilesRecursively(baseDir: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    const frontier: string[] = [''];

    while (frontier.length > 0) {
      const currentSubDir: string = frontier.pop()!;
      const folderPath = path.join(baseDir, currentSubDir);
      const items = await FileSystem.readFolderItemsAsync(folderPath);

      await Promise.all(
        items.map(async (item) => {
          // Ignore the "template.json" in the root
          if (currentSubDir === '' && item.name === SPFxTemplateJsonFile.TEMPLATE_JSON) {
            return;
          }

          const relativePath: string = path.join(currentSubDir, item.name);

          if (item.isFile()) {
            const fullPath: string = path.join(folderPath, item.name);
            const content = await FileSystem.readFileAsync(fullPath);
            files.set(relativePath, content);
          } else if (item.isDirectory()) {
            frontier.push(relativePath);
          }
        })
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
  public async render(context: object, destinationDir: string): Promise<MemFsEditor> {
    const { create: createMemFs } = await import('mem-fs');
    const { create: createEditor } = await import('mem-fs-editor');

    // use the template "schema" to validate the context object
    if (this._definition.contextSchema) {
      // Build a Zod schema from the contextSchema metadata
      const schemaShape: Record<string, z.ZodString> = {};
      for (const [key, value] of Object.entries(this._definition.contextSchema)) {
        if (value.type === 'string') {
          schemaShape[key] = z.string();
        }
      }
      const contextSchema = z.object(schemaShape);
      const validationResult = contextSchema.safeParse(context);
      if (!validationResult.success) {
        throw new Error(`Invalid context object: ${validationResult.error}`);
      }
    }

    const fs: MemFsEditor = createEditor(createMemFs());

    for (const [filename, contents] of this._files.entries()) {
      // Render the filename by replacing {variableName} placeholders
      let renderedFilename = filename;
      for (const [key, value] of Object.entries(context)) {
        const placeholder = `{${key}}`;
        renderedFilename = renderedFilename.split(placeholder).join(String(value));
      }
      const destination = path.join(destinationDir, renderedFilename);

      // Process file contents as EJS template
      const rendered = ejs.render(contents, context, {
        filename,
        cache: false
      });
      fs.write(destination, rendered);
    }

    return fs;
  }

  /**
   * Commits the rendered files to disk.
   * @param fs - The MemFsEditor instance containing the files to write
   * @returns A Promise that resolves when all files have been written
   */
  public write(fs: MemFsEditor): Promise<void> {
    return fs.commit();
  }

  /**
   * Returns a string representation of the template including its metadata.
   * @returns A formatted string with template details
   */
  public toString(): string {
    // print the name, description, version, spfxVersion, and number of files as a table
    return [
      `Template Name: ${this.name}`,
      `Description: ${this.description || 'N/A'}`,
      `Version: ${this.version}`,
      `SPFx Version: ${this.spfxVersion}`,
      `Number of Files: ${this._files.size}`
    ].join('\n');
  }
}
