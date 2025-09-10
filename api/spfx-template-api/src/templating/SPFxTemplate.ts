import { FileSystem } from '@rushstack/node-core-library';
import * as path from 'path';
import semverRegex from 'semver-regex';
import * as z from 'zod';

import { SPFxTemplateJsonFile } from './SPFxTemplateJsonFile';

/** @public The minimum length of the template name */
export const NAME_MIN_LENGTH: number = 3;

/** @public The maximum length of the template name */
export const NAME_MAX_LENGTH: number = 100;

/** @public The maximum length of the template description */
export const DESCRIPTION_MAX_LENGTH: number = 500;

const VERSION_REGEX: RegExp = semverRegex();
const SPFX_VERSION_REGEX: RegExp = semverRegex();

/**
 * @public
 * Interface for SPFx template definition.
 */
export interface ISPFxTemplateDefinition {
    $schema: string;
    name: string;
    description?: string;
    version: string;
    spfxVersion: string;
}

/**
 * @public
 * The schema for validating SPFx template definition files (template.json).
 */
export const SPFxTemplateDefinitionSchema: z.ZodType<ISPFxTemplateDefinition> = z.object({
    $schema: z.string().url(),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    version: z.string().regex(VERSION_REGEX),
    spfxVersion: z.string().regex(SPFX_VERSION_REGEX)
});

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template, which can be rendered.
 */
export class SPFxTemplate {
    private readonly _definition: SPFxTemplateJsonFile;
    private readonly _files: Map<string, Buffer>;

    public constructor(
        definition: SPFxTemplateJsonFile,
        files: Map<string, Buffer>
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

    private static async _readFilesRecursively(baseDir: string): Promise<Map<string, Buffer>> {
        const files = new Map<string, Buffer>();
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
                    const content = await FileSystem.readFileToBufferAsync(fullPath);
                    files.set(relativePath, content);
                } else if (item.isDirectory()) {
                    frontier.push(relativePath);
                }
            }));
        }
        
        return files;
    }

    public render(context: object): string {
        // Render the template using the definition and context
        return '';
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