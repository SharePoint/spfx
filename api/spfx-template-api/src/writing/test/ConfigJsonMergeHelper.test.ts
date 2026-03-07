// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ConfigJsonMergeHelper } from '../ConfigJsonMergeHelper';

describe('ConfigJsonMergeHelper', () => {
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
        'goodbye-world-bundle': { components: [{ entrypoint: './lib/goodbye.js' }] }
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.bundles['hello-world-bundle']).toBeDefined();
    expect(result.bundles['goodbye-world-bundle']).toBeDefined();
  });

  it('should merge localizedResources by key', () => {
    const existing = JSON.stringify({
      localizedResources: {
        HelloWorldStrings: 'lib/loc/{locale}.js'
      }
    });

    const incoming = JSON.stringify({
      localizedResources: {
        GoodbyeWorldStrings: 'lib/loc/{locale}.js'
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.localizedResources.HelloWorldStrings).toBe('lib/loc/{locale}.js');
    expect(result.localizedResources.GoodbyeWorldStrings).toBe('lib/loc/{locale}.js');
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
});
