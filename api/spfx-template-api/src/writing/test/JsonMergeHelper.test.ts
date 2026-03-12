// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonMergeHelper } from '../JsonMergeHelper';

/**
 * Concrete subclass that exposes the protected methods for testing.
 */
class TestJsonMergeHelper extends JsonMergeHelper {
  public get fileRelativePath(): string {
    return 'test/file.json';
  }

  public merge(existingContent: string, newContent: string): string {
    const existing = this.parseJson<Record<string, unknown>>(existingContent);
    const incoming = this.parseJson<Record<string, unknown>>(newContent);
    return this.serializeJson({ ...existing, ...incoming });
  }

  // Expose protected methods for direct testing
  public testParseJson<T>(content: string): T {
    return this.parseJson<T>(content);
  }

  public testSerializeJson(value: unknown): string {
    return this.serializeJson(value);
  }
}

describe(JsonMergeHelper.name, () => {
  let helper: TestJsonMergeHelper;

  beforeEach(() => {
    helper = new TestJsonMergeHelper();
  });

  describe('parseJson', () => {
    it('should parse a valid JSON string', () => {
      const result = helper.testParseJson<{ a: number }>('{"a":1}');
      expect(result).toEqual({ a: 1 });
    });

    it('should parse nested objects', () => {
      const input = JSON.stringify({ a: { b: { c: [1, 2, 3] } } });
      const result = helper.testParseJson<Record<string, unknown>>(input);
      expect(result).toEqual({ a: { b: { c: [1, 2, 3] } } });
    });

    it('should throw SyntaxError for invalid JSON', () => {
      expect(() => helper.testParseJson('not json')).toThrow(SyntaxError);
    });

    it('should throw SyntaxError for empty string', () => {
      expect(() => helper.testParseJson('')).toThrow(SyntaxError);
    });

    it('should handle special characters in keys and values', () => {
      const input = JSON.stringify({ 'key with "quotes"': 'value with \u00e9\u00e8\u00ea' });
      const result = helper.testParseJson<Record<string, string>>(input);
      expect(result['key with "quotes"']).toBe('value with \u00e9\u00e8\u00ea');
    });
  });

  describe('serializeJson', () => {
    it('should serialize with 2-space indentation', () => {
      const result = helper.testSerializeJson({ a: 1, b: 2 });
      expect(result).toBe(JSON.stringify({ a: 1, b: 2 }, undefined, 2) + '\n');
    });

    it('should append a trailing newline', () => {
      const result = helper.testSerializeJson({});
      expect(result.endsWith('\n')).toBe(true);
    });

    it('should serialize null', () => {
      const result = helper.testSerializeJson(null);
      expect(result).toBe('null\n');
    });

    it('should serialize arrays', () => {
      const result = helper.testSerializeJson([1, 2]);
      expect(result).toBe(JSON.stringify([1, 2], undefined, 2) + '\n');
    });
  });

  describe('round-trip', () => {
    it('should produce deterministic output when parsing then serializing', () => {
      const original = { name: 'test', version: '1.0.0', nested: { a: [1, 2] } };
      const serialized = helper.testSerializeJson(original);
      const parsed = helper.testParseJson<typeof original>(serialized);
      const reSerialized = helper.testSerializeJson(parsed);
      expect(reSerialized).toBe(serialized);
    });
  });
});
