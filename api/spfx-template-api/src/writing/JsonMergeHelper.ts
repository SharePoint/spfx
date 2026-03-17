// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonFile, type JsonObject, JsonSyntax } from '@rushstack/node-core-library';

import type { IMergeHelper } from './IMergeHelper';

/**
 * Abstract base class for merge helpers that deal with JSON files.
 * Provides convenience methods for parsing and serializing JSON.
 *
 * @public
 */
export abstract class JsonMergeHelper implements IMergeHelper {
  public abstract readonly fileRelativePath: string;

  public abstract merge(existingContent: string, newContent: string): string;

  /**
   * Parses a JSON string into a typed object. Supports JSONC (JSON with comments).
   * @param content - The JSON string to parse
   * @returns The parsed object
   */
  protected parseJson<T>(content: string): T {
    return JsonFile.parseString(content, { jsonSyntax: JsonSyntax.JsonWithComments }) as unknown as T;
  }

  /**
   * Serializes an object to a JSON string, preserving comments and formatting from the original content.
   * @param value - The object to serialize
   * @param originalContent - The original JSON string whose formatting should be preserved
   * @returns A JSON string preserving the original formatting
   */
  protected serializeJson<T extends JsonObject>(value: T, originalContent: string): string {
    return JsonFile.updateString(originalContent, value, {
      ignoreUndefinedValues: true,
      jsonSyntax: JsonSyntax.JsonWithComments
    });
  }
}
