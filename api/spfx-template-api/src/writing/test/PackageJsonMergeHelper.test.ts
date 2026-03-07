// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { PackageJsonMergeHelper } from '../PackageJsonMergeHelper';

describe('PackageJsonMergeHelper', () => {
  let helper: PackageJsonMergeHelper;

  beforeEach(() => {
    helper = new PackageJsonMergeHelper();
  });

  it('should have fileRelativePath of "package.json"', () => {
    expect(helper.fileRelativePath).toBe('package.json');
  });

  it('should union dependencies with existing versions winning', () => {
    const existing = JSON.stringify({
      name: 'my-project',
      dependencies: {
        lodash: '^4.17.0',
        react: '^17.0.0'
      }
    });

    const incoming = JSON.stringify({
      name: 'incoming-project',
      dependencies: {
        lodash: '^4.18.0',
        axios: '^1.0.0'
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.dependencies.lodash).toBe('^4.17.0');
    expect(result.dependencies.react).toBe('^17.0.0');
    expect(result.dependencies.axios).toBe('^1.0.0');
  });

  it('should union devDependencies with existing versions winning', () => {
    const existing = JSON.stringify({
      devDependencies: {
        jest: '^29.0.0'
      }
    });

    const incoming = JSON.stringify({
      devDependencies: {
        jest: '^30.0.0',
        typescript: '^5.0.0'
      }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.devDependencies.jest).toBe('^29.0.0');
    expect(result.devDependencies.typescript).toBe('^5.0.0');
  });

  it('should preserve existing metadata fields', () => {
    const existing = JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      scripts: { build: 'tsc' },
      engines: { node: '>=18' },
      dependencies: {}
    });

    const incoming = JSON.stringify({
      name: 'template-project',
      version: '0.0.0',
      dependencies: { lodash: '^4.17.0' }
    });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.name).toBe('my-project');
    expect(result.version).toBe('1.0.0');
    expect(result.scripts).toEqual({ build: 'tsc' });
    expect(result.engines).toEqual({ node: '>=18' });
  });

  it('should handle missing dependencies in existing', () => {
    const existing = JSON.stringify({ name: 'my-project' });
    const incoming = JSON.stringify({ dependencies: { lodash: '^4.17.0' } });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.dependencies.lodash).toBe('^4.17.0');
  });

  it('should handle missing dependencies in incoming', () => {
    const existing = JSON.stringify({ dependencies: { lodash: '^4.17.0' } });
    const incoming = JSON.stringify({ name: 'template' });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.dependencies.lodash).toBe('^4.17.0');
  });

  it('should handle both missing dependencies', () => {
    const existing = JSON.stringify({ name: 'my-project' });
    const incoming = JSON.stringify({ name: 'template' });

    const result = JSON.parse(helper.merge(existing, incoming));

    expect(result.dependencies).toBeUndefined();
    expect(result.devDependencies).toBeUndefined();
  });
});
