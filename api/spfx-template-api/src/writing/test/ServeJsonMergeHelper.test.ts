// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ServeJsonMergeHelper } from '../ServeJsonMergeHelper';

describe('ServeJsonMergeHelper', () => {
  let helper: ServeJsonMergeHelper;

  beforeEach(() => {
    helper = new ServeJsonMergeHelper();
  });

  it('should have fileRelativePath of "config/serve.json"', () => {
    expect(helper.fileRelativePath).toBe('config/serve.json');
  });

  it('should merge serveConfigurations by name', () => {
    const existing = JSON.stringify({
      $schema: 'https://schema.example.com',
      port: 4321,
      https: true,
      initialPage: 'https://localhost',
      serveConfigurations: {
        helloWorld: { pageUrl: 'https://localhost/hello' }
      }
    });

    const incoming = JSON.stringify({
      $schema: 'https://schema.example.com',
      port: 5000,
      https: false,
      initialPage: 'https://other',
      serveConfigurations: {
        goodbyeWorld: { pageUrl: 'https://localhost/goodbye' }
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.serveConfigurations.helloWorld).toBeDefined();
    expect(result.serveConfigurations.goodbyeWorld).toBeDefined();
  });

  it('should preserve port, https, and initialPage from existing', () => {
    const existing = JSON.stringify({
      port: 4321,
      https: true,
      initialPage: 'https://localhost/existing',
      serveConfigurations: {}
    });

    const incoming = JSON.stringify({
      port: 9999,
      https: false,
      initialPage: 'https://localhost/incoming',
      serveConfigurations: { newConfig: {} }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.port).toBe(4321);
    expect(result.https).toBe(true);
    expect(result.initialPage).toBe('https://localhost/existing');
  });

  it('should handle missing serveConfigurations in existing', () => {
    const existing = JSON.stringify({
      port: 4321
    });

    const incoming = JSON.stringify({
      serveConfigurations: {
        helloWorld: { pageUrl: 'https://localhost/hello' }
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.serveConfigurations.helloWorld).toBeDefined();
  });

  it('should handle missing serveConfigurations in incoming', () => {
    const existing = JSON.stringify({
      serveConfigurations: {
        helloWorld: { pageUrl: 'https://localhost/hello' }
      }
    });

    const incoming = JSON.stringify({
      port: 4321
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.serveConfigurations.helloWorld).toBeDefined();
  });

  describe('error handling', () => {
    it('should throw when existing content is invalid JSON', () => {
      const incoming = JSON.stringify({ serveConfigurations: {} });
      expect(() => helper.merge('not json', incoming)).toThrow(SyntaxError);
    });

    it('should throw when incoming content is invalid JSON', () => {
      const existing = JSON.stringify({ serveConfigurations: {} });
      expect(() => helper.merge(existing, 'not json')).toThrow(SyntaxError);
    });
  });

  describe('edge cases', () => {
    it('should overwrite existing serveConfiguration when incoming has same key', () => {
      const existing = JSON.stringify({
        serveConfigurations: {
          shared: { pageUrl: 'https://localhost/old' }
        }
      });

      const incoming = JSON.stringify({
        serveConfigurations: {
          shared: { pageUrl: 'https://localhost/new' }
        }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.serveConfigurations.shared.pageUrl).toBe('https://localhost/new');
    });

    it('should not add serveConfigurations when neither side defines it', () => {
      const existing = JSON.stringify({ port: 4321 });
      const incoming = JSON.stringify({ port: 9999 });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.port).toBe(4321);
      expect(result.serveConfigurations).toBeUndefined();
    });

    it('should handle empty serveConfigurations objects', () => {
      const existing = JSON.stringify({ port: 4321, serveConfigurations: {} });
      const incoming = JSON.stringify({ port: 5000, serveConfigurations: {} });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.serveConfigurations).toEqual({});
      expect(result.port).toBe(4321);
    });

    it('should preserve unknown top-level fields from existing', () => {
      const existing = JSON.stringify({
        port: 4321,
        serveConfigurations: {},
        customSetting: 'preserved',
        debugMode: true
      });

      const incoming = JSON.stringify({
        port: 9999,
        serveConfigurations: { newConfig: {} }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.customSetting).toBe('preserved');
      expect(result.debugMode).toBe(true);
    });
  });
});
