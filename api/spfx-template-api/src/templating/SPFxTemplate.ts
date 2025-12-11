import { FileSystem } from '@rushstack/node-core-library';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor, type MemFsEditor } from 'mem-fs-editor';
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

    public constructor(
        definition: SPFxTemplateJsonFile,
        files: Map<string, string>
    ) {
        this._definition = definition;
        this._files = files;
    }

    public get name(): string {
        return this._definition.name;
    }

    public get description(): string | undefined {
        return this._definition.description;
    }

    public get version(): string {
        return this._definition.version;
    }

    public get spfxVersion(): string {
        return this._definition.spfxVersion;
    }

    

    public static async fromFolderAsync(path: string): Promise<SPFxTemplate> {
        const templateJsonFile: SPFxTemplateJsonFile = await SPFxTemplateJsonFile.fromFolderAsync(path);
        const files = await SPFxTemplate._readFilesRecursively(path);
        return new SPFxTemplate(templateJsonFile, files);
    }

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
            
            await Promise.all(items.map(async (item) => {
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
            }));
        }
        
        return files;
    }

    public async render(context: object, destinationDir: string): Promise<MemFsEditor> {
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
                // eslint-disable-next-line @rushstack/security/no-unsafe-regexp
                renderedFilename = renderedFilename.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            }
            const destination = path.join(destinationDir, renderedFilename);
            const rendered = fs._processTpl({ contents, filename, context });
            console.log(`Writing file: ${destination}`);
            fs.write(destination, rendered);
        }

        return fs;
    }

    public write(fs: MemFsEditor): Promise<void> {
        return fs.commit();
    }

    public toString(): string {
        // print the name, description, version, spfxVersion, and number of files as a table
        return [
            `Template Name: ${this.name}`,
            `Description: ${this.description || 'N/A'}`,
            `Version: ${this.version}`,
            `SPFx Version: ${this.spfxVersion}`,
            `Number of Files: ${this._files.size}`
        ].join("\n");
    }
}