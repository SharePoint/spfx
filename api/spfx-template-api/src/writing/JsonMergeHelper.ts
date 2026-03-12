// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

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
   * Parses a JSON string into a typed object.
   * @param content - The JSON string to parse
   * @returns The parsed object
   */
  protected parseJson<T>(content: string): T {
    return JSON.parse(content) as T;
  }

  /**
   * Serializes an object to a JSON string with consistent formatting.
   * @param value - The object to serialize
   * @returns A JSON string with 2-space indentation and a trailing newline
   */
  protected serializeJson(value: unknown): string {
    return JSON.stringify(value, undefined, 2) + '\n';
  }
}
