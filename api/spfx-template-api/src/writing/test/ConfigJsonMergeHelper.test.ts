// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ConfigJsonMergeHelper } from '../ConfigJsonMergeHelper';

describe(ConfigJsonMergeHelper.name, () => {
  let helper: ConfigJsonMergeHelper;

  beforeEach(() => {
    helper = new ConfigJsonMergeHelper();
  });

  it('should have fileRelativePath of "config/config.json"', () => {
    expect(helper.fileRelativePath).toBe('config/config.json');
  });

  it('should merge bundles by key', () => {
    const existing = JSON.stringify({
      $schema: 'https://schema.example.com',
      version: '2.0',
      bundles: {
        'hello-world-bundle': { components: [{ entrypoint: './lib/hello.js' }] }
      }
    });

    const incoming = JSON.stringify({
      $schema: 'https://schema.example.com',
      version: '2.0',
      bundles: {
        'weather-widget-bundle': { components: [{ entrypoint: './lib/weather.js' }] }
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.bundles['hello-world-bundle']).toBeDefined();
    expect(result.bundles['weather-widget-bundle']).toBeDefined();
  });

  it('should merge localizedResources by key', () => {
    const existing = JSON.stringify({
      localizedResources: {
        HelloWorldStrings: 'lib/loc/{locale}.js'
      }
    });

    const incoming = JSON.stringify({
      localizedResources: {
        WeatherWidgetStrings: 'lib/loc/{locale}.js'
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.localizedResources.HelloWorldStrings).toBe('lib/loc/{locale}.js');
    expect(result.localizedResources.WeatherWidgetStrings).toBe('lib/loc/{locale}.js');
  });

  it('should merge externals by key', () => {
    const existing = JSON.stringify({
      externals: {
        jquery: 'https://cdn.example.com/jquery.js'
      }
    });

    const incoming = JSON.stringify({
      externals: {
        lodash: 'https://cdn.example.com/lodash.js'
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.externals.jquery).toBe('https://cdn.example.com/jquery.js');
    expect(result.externals.lodash).toBe('https://cdn.example.com/lodash.js');
  });

  it('should preserve $schema and version from existing', () => {
    const existing = JSON.stringify({
      $schema: 'https://existing-schema.example.com',
      version: '2.0',
      bundles: {}
    });

    const incoming = JSON.stringify({
      $schema: 'https://new-schema.example.com',
      version: '3.0',
      bundles: { 'new-bundle': {} }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.$schema).toBe('https://existing-schema.example.com');
    expect(result.version).toBe('2.0');
  });

  describe('error handling', () => {
    it('should throw when existing content is invalid JSON', () => {
      const incoming = JSON.stringify({ bundles: {} });
      expect(() => helper.merge('not json', incoming)).toThrow(SyntaxError);
    });

    it('should throw when incoming content is invalid JSON', () => {
      const existing = JSON.stringify({ bundles: {} });
      expect(() => helper.merge(existing, 'not json')).toThrow(SyntaxError);
    });

    it('should throw when existing content is empty string', () => {
      const incoming = JSON.stringify({ bundles: {} });
      expect(() => helper.merge('', incoming)).toThrow(SyntaxError);
    });
  });

  describe('edge cases', () => {
    it('should overwrite existing bundle when incoming has same key', () => {
      const existing = JSON.stringify({
        bundles: { 'shared-bundle': { components: [{ entrypoint: './lib/old.js' }] } }
      });

      const incoming = JSON.stringify({
        bundles: { 'shared-bundle': { components: [{ entrypoint: './lib/new.js' }] } }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.bundles['shared-bundle'].components[0].entrypoint).toBe('./lib/new.js');
    });

    it('should overwrite existing externals when incoming has same key', () => {
      const existing = JSON.stringify({
        externals: { jquery: 'https://cdn.example.com/jquery-old.js' }
      });

      const incoming = JSON.stringify({
        externals: { jquery: 'https://cdn.example.com/jquery-new.js' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.externals.jquery).toBe('https://cdn.example.com/jquery-new.js');
    });

    it('should overwrite existing localizedResources when incoming has same key', () => {
      const existing = JSON.stringify({
        localizedResources: { SharedStrings: 'lib/loc/old/{locale}.js' }
      });

      const incoming = JSON.stringify({
        localizedResources: { SharedStrings: 'lib/loc/new/{locale}.js' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.localizedResources.SharedStrings).toBe('lib/loc/new/{locale}.js');
    });

    it('should handle empty objects for bundles, localizedResources, and externals', () => {
      const existing = JSON.stringify({ bundles: {}, localizedResources: {}, externals: {} });
      const incoming = JSON.stringify({ bundles: {}, localizedResources: {}, externals: {} });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.bundles).toEqual({});
      expect(result.localizedResources).toEqual({});
      expect(result.externals).toEqual({});
    });

    it('should handle undefined bundles in existing', () => {
      const existing = JSON.stringify({ $schema: 'https://schema.example.com' });
      const incoming = JSON.stringify({ bundles: { 'new-bundle': {} } });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.bundles['new-bundle']).toBeDefined();
    });

    it('should handle undefined bundles in incoming', () => {
      const existing = JSON.stringify({ bundles: { 'old-bundle': {} } });
      const incoming = JSON.stringify({ $schema: 'https://schema.example.com' });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.bundles['old-bundle']).toBeDefined();
    });

    it('should preserve unknown top-level fields from existing', () => {
      const existing = JSON.stringify({
        bundles: {},
        localizedResources: {},
        externals: {},
        customField: 'custom-value',
        anotherField: 42
      });

      const incoming = JSON.stringify({
        bundles: { 'new-bundle': {} },
        localizedResources: {},
        externals: {}
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.customField).toBe('custom-value');
      expect(result.anotherField).toBe(42);
    });
  });
});
