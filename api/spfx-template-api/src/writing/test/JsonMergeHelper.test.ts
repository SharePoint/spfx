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
    return this.serializeJson({ ...existing, ...incoming }, existingContent);
  }

  // Expose protected methods for direct testing
  public testParseJson<T>(content: string): T {
    return this.parseJson<T>(content);
  }

  public testSerializeJson(value: unknown, originalContent: string): string {
    return this.serializeJson(value, originalContent);
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

    it('should throw for invalid JSON', () => {
      expect(() => helper.testParseJson('not json')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => helper.testParseJson('')).toThrow();
    });

    it('should handle special characters in keys and values', () => {
      const input = JSON.stringify({ 'key with "quotes"': 'value with \u00e9\u00e8\u00ea' });
      const result = helper.testParseJson<Record<string, string>>(input);
      expect(result['key with "quotes"']).toBe('value with \u00e9\u00e8\u00ea');
    });

    it('should parse JSONC (JSON with comments)', () => {
      const input = '{\n  // This is a comment\n  "a": 1\n}';
      const result = helper.testParseJson<{ a: number }>(input);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('serializeJson', () => {
    it('should produce valid JSON output', () => {
      const original = JSON.stringify({ a: 1, b: 2 }, undefined, 2) + '\n';
      const result = helper.testSerializeJson({ a: 1, b: 2 }, original);
      expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
    });

    it('should append a trailing newline', () => {
      const original = JSON.stringify({}, undefined, 2) + '\n';
      const result = helper.testSerializeJson({}, original);
      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('should produce deterministic output when parsing then serializing', () => {
      const original = JSON.stringify(
        { name: 'test', version: '1.0.0', nested: { a: [1, 2] } },
        undefined,
        2
      );
      const parsed = helper.testParseJson<Record<string, unknown>>(original);
      const reSerialized = helper.testSerializeJson(parsed, original);
      const reParsed = helper.testParseJson<Record<string, unknown>>(reSerialized);
      expect(reParsed).toEqual(parsed);
    });

    it('should preserve JSONC comments in round-trip', () => {
      const original = '{\n  // This is a comment\n  "a": 1\n}\n';
      const result = helper.testSerializeJson({ a: 1, b: 2 }, original);
      expect(result).toContain('// This is a comment');
      expect(helper.testParseJson<Record<string, unknown>>(result)).toEqual({ a: 1, b: 2 });
    });
  });
});
