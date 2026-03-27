// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';

import * as z from 'zod';
import { valid as semverValid } from 'semver';

import { FileSystem } from '@rushstack/node-core-library';

const NAME_MIN_LENGTH: number = 3;
const NAME_MAX_LENGTH: number = 100;
const DESCRIPTION_MAX_LENGTH: number = 500;

/**
 * The allowed category values for SPFx templates.
 * @public
 */
export const SPFX_TEMPLATE_CATEGORIES: readonly ['webpart', 'extension', 'ace', 'library'] = [
  'webpart',
  'extension',
  'ace',
  'library'
] as const;

/**
 * The category of an SPFx template.
 * @public
 */
export type SPFxTemplateCategory = (typeof SPFX_TEMPLATE_CATEGORIES)[number];

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
  /** The category of the template */
  category: SPFxTemplateCategory;
  /** Optional description of the template */
  description?: string;
  /** The version of the template (semantic version format) */
  version: string;
  /** The SPFx version this template is compatible with */
  spfxVersion: string;
  /** Optional schema defining the context variables required by this template */
  contextSchema?: Record<string, { type: 'string'; description: string }>;
  /**
   * Optional minimum engine version required to process this template.
   * When set, the template engine's orchestrator (for example,
   * {@link SPFxTemplateRepositoryManager}) will compare this value against
   * ENGINE_VERSION and reject the template if the engine is too old. Must be
   * a valid semver string. Callers that construct templates directly are
   * responsible for enforcing this contract themselves, if desired.
   */
  minimumEngineVersion?: string;
}

/**
 * The Zod shape for the template.json schema.  Defined as a standalone object so
 * that {@link KNOWN_TEMPLATE_JSON_FIELDS} can be derived from its keys, keeping the
 * set of recognized fields automatically in sync with the schema definition.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- inferred type preserves the specific Zod shape needed by z.object()
const _templateJsonSchemaShape = {
  $schema: z.url().optional(),
  name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH),
  category: z.enum(SPFX_TEMPLATE_CATEGORIES),
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
    .optional(),
  minimumEngineVersion: z
    .string()
    .refine(isValidSemver, {
      message: 'Invalid semantic version for "minimumEngineVersion" (expected format like "1.0.0").'
    })
    .optional()
};

/**
 * The set of field names recognized by this version of the engine.
 * Derived from the Zod schema shape so it stays in sync automatically.
 * Used to detect unknown fields for forward-compatibility warnings.
 */
const KNOWN_TEMPLATE_JSON_FIELDS: ReadonlySet<string> = new Set(Object.keys(_templateJsonSchemaShape));

/**
 * @public
 * The schema for validating SPFx template definition files (template.json).
 *
 * Uses `.passthrough()` instead of `.strict()` so that unknown fields added
 * in future engine versions are tolerated by older engines (forward compatibility).
 */
export const SPFxTemplateDefinitionSchema: z.ZodType<ISPFxTemplateJson> = z
  .object(_templateJsonSchemaShape)
  .passthrough();

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template JSON file.
 */
export class SPFxTemplateJsonFile {
  public static readonly TEMPLATE_JSON: string = 'template.json';

  private _data: ISPFxTemplateJson;
  private _unknownFields: readonly string[];

  public constructor(data: ISPFxTemplateJson) {
    this._data = data;
    this._unknownFields = Object.keys(data).filter((k) => !KNOWN_TEMPLATE_JSON_FIELDS.has(k));
  }

  /**
   * Gets the name of the template.
   */
  public get name(): string {
    return this._data.name;
  }

  /**
   * Gets the category of the template.
   */
  public get category(): SPFxTemplateCategory {
    return this._data.category;
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
   * Gets the minimum engine version required to process this template.
   * Returns undefined if no minimum is specified.
   */
  public get minimumEngineVersion(): string | undefined {
    return this._data.minimumEngineVersion;
  }

  /**
   * Gets the list of field names in template.json that are not recognized by this
   * version of the engine. Non-empty when a newer engine version added fields that
   * this version does not know about.
   */
  public get unknownFields(): readonly string[] {
    return this._unknownFields;
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
