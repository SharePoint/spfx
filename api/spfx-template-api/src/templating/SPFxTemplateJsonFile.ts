import * as path from 'path';
import * as z from 'zod';
import semverRegex from 'semver-regex';
import { FileSystem } from '@rushstack/node-core-library';

const NAME_MIN_LENGTH: number = 3;
const NAME_MAX_LENGTH: number = 100;
const DESCRIPTION_MAX_LENGTH: number = 500;
const VERSION_REGEX: RegExp = semverRegex();
const SPFX_VERSION_REGEX: RegExp = semverRegex();

interface ISPFxTemplateJson {
    $schema?: string;
    name: string;
    description?: string;
    version: string;
    spfxVersion: string;
    contextSchema?: Record<string, { type: 'string'; description: string }>;
};

/**
 * @public
 * The schema for validating SPFx template definition files (template.json).
 */
export const SPFxTemplateDefinitionSchema: z.ZodType<ISPFxTemplateJson> = z.object({
    $schema: z.url().optional(),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    version: z.string().regex(VERSION_REGEX),
    spfxVersion: z.string().regex(SPFX_VERSION_REGEX),
    contextSchema: z.record(z.string(),
        z.object({
            type: z.enum(['string']),
            description: z.string()
        })
    ).optional()
}).strict();

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template JSON file.
 */
export class SPFxTemplateJsonFile {
    public static readonly TEMPLATE_JSON: string = 'template.json';

    private _data: ISPFxTemplateJson;

    public constructor(data: ISPFxTemplateJson) {
        this._data = data;
    }

    /**
     * Gets the name of the template.
     */
    public get name(): string {
        return this._data.name;
    }

    /**
     * Gets the description of the template.
     */
    public get description(): string | undefined {
        return this._data.description;
    }

    /**
     * Gets the version of the template.
     */
    public get version(): string {
        return this._data.version;
    }

    /**
     * Gets the SPFx version this template is compatible with.
     */
    public get spfxVersion(): string {
        return this._data.spfxVersion;
    }

    /**
     * Gets the context schema defining the variables required for template rendering.
     */
    public get contextSchema(): Record<string, { type: 'string'; description: string }> | undefined {
        return this._data.contextSchema;
    }

    /**
     * Creates a new SPFxTemplateJsonFile instance from a file path.
     * @param filePath - The path to the template.json file
     * @returns A Promise that resolves to a new SPFxTemplateJsonFile instance
     */
    public static async fromFileAsync(filePath: string): Promise<SPFxTemplateJsonFile> {
        const content: string = await FileSystem.readFileAsync(filePath);
        const parsed = JSON.parse(content);
        const result = SPFxTemplateDefinitionSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Invalid template.json file at ${filePath}: ${result.error}`);
        }
        return new SPFxTemplateJsonFile(result.data);
    }

    /**
     * Creates a new SPFxTemplateJsonFile instance from a folder containing a template.json file.
     * @param folderPath - The path to the folder containing the template.json file
     * @returns A Promise that resolves to a new SPFxTemplateJsonFile instance
     */
    public static async fromFolderAsync(folderPath: string): Promise<SPFxTemplateJsonFile> {
        const filePath = path.join(folderPath, SPFxTemplateJsonFile.TEMPLATE_JSON);
        return SPFxTemplateJsonFile.fromFileAsync(filePath);
    }
}