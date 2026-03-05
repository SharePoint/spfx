// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';

import * as z from 'zod';
import { valid as semverValid } from 'semver';

import { FileSystem } from '@rushstack/node-core-library';

const NAME_MIN_LENGTH: number = 3;
const NAME_MAX_LENGTH: number = 100;
const DESCRIPTION_MAX_LENGTH: number = 500;

function isValidSemver(version: string): boolean {
  return semverValid(version) !== null;
}

/**
 * Interface representing the template.json file structure for SPFx templates.
 * @public
 */
export interface ISPFxTemplateJson {
  /** Optional JSON schema reference */
  $schema?: string;
  /** The name of the template */
  name: string;
  /** Optional description of the template */
  description?: string;
  /** The version of the template (semantic version format) */
  version: string;
  /** The SPFx version this template is compatible with */
  spfxVersion: string;
  /** Optional schema defining the context variables required by this template */
  contextSchema?: Record<string, { type: 'string'; description: string }>;
}

/**
 * @public
 * The schema for validating SPFx template definition files (template.json).
 */
export const SPFxTemplateDefinitionSchema: z.ZodType<ISPFxTemplateJson> = z
  .object({
    $schema: z.url().optional(),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
    description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
    version: z.string().refine(isValidSemver, {
      message: 'Invalid semantic version for "version" (expected format like "1.0.0").'
    }),
    spfxVersion: z.string().refine(isValidSemver, {
      message: 'Invalid semantic version for "spfxVersion" (expected format like "1.0.0").'
    }),
    contextSchema: z
      .record(
        z.string(),
        z.object({
          type: z.enum(['string']),
          description: z.string()
        })
      )
      .optional()
  })
  .strict();

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
    const parsed: ISPFxTemplateJson = JSON.parse(content);
    const result: z.ZodSafeParseResult<ISPFxTemplateJson> = SPFxTemplateDefinitionSchema.safeParse(parsed);
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
    const filePath: string = path.join(folderPath, SPFxTemplateJsonFile.TEMPLATE_JSON);
    return SPFxTemplateJsonFile.fromFileAsync(filePath);
  }
}
