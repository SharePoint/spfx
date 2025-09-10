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
};

/**
 * @public
 * The schema for validating SPFx template definition files (template.json).
 */
const SPFxTemplateDefinitionSchema: z.ZodType<ISPFxTemplateJson> = z.object({
    $schema: z.url().optional(),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    version: z.string().regex(VERSION_REGEX),
    spfxVersion: z.string().regex(SPFX_VERSION_REGEX)
});

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

    public get name(): string {
        return this._data.name;
    }

    public get description(): string | undefined {
        return this._data.description;
    }

    public get version(): string {
        return this._data.version;
    }

    public get spfxVersion(): string {
        return this._data.spfxVersion;
    }

    public static async fromFileAsync(filePath: string): Promise<SPFxTemplateJsonFile> {
        const content: string = await FileSystem.readFileAsync(filePath);
        const parsed = JSON.parse(content);
        const result = SPFxTemplateDefinitionSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Invalid template.json file at ${filePath}: ${result.error}`);
        }
        return new SPFxTemplateJsonFile(result.data);
    }

    public static async fromFolderAsync(folderPath: string): Promise<SPFxTemplateJsonFile> {
        const filePath = path.join(folderPath, SPFxTemplateJsonFile.TEMPLATE_JSON);
        return SPFxTemplateJsonFile.fromFileAsync(filePath);
    }
}