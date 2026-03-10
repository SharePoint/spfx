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

  describe('error handling', () => {
    it('should throw when existing content is invalid JSON', () => {
      const incoming = JSON.stringify({ dependencies: {} });
      expect(() => helper.merge('not json', incoming)).toThrow(SyntaxError);
    });

    it('should throw when incoming content is invalid JSON', () => {
      const existing = JSON.stringify({ dependencies: {} });
      expect(() => helper.merge(existing, '{invalid')).toThrow(SyntaxError);
    });
  });

  describe('SPFx version conflict detection', () => {
    it('should throw when @microsoft/* dependency versions differ', () => {
      const existing = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.22.0' }
      });

      const incoming = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.23.0' }
      });

      expect(() => helper.merge(existing, incoming)).toThrow(
        /SPFx version mismatch for "@microsoft\/sp-core-library"/
      );
    });

    it('should throw when @microsoft/* devDependency versions differ', () => {
      const existing = JSON.stringify({
        devDependencies: { '@microsoft/spfx-heft-plugins': '1.22.0' }
      });

      const incoming = JSON.stringify({
        devDependencies: { '@microsoft/spfx-heft-plugins': '1.23.0' }
      });

      expect(() => helper.merge(existing, incoming)).toThrow(
        /SPFx version mismatch for "@microsoft\/spfx-heft-plugins"/
      );
    });

    it('should allow non-@microsoft dependency version conflicts', () => {
      const existing = JSON.stringify({
        dependencies: { lodash: '^4.17.0', tslib: '2.3.0' }
      });

      const incoming = JSON.stringify({
        dependencies: { lodash: '^4.18.0', tslib: '2.4.0' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.dependencies.lodash).toBe('^4.17.0');
      expect(result.dependencies.tslib).toBe('2.3.0');
    });

    it('should allow matching @microsoft/* versions', () => {
      const existing = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.22.0' }
      });

      const incoming = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.22.0', '@microsoft/sp-webpart-base': '1.22.0' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.dependencies['@microsoft/sp-core-library']).toBe('1.22.0');
      expect(result.dependencies['@microsoft/sp-webpart-base']).toBe('1.22.0');
    });

    it('should throw when @microsoft/* version differs across dep types (dep vs devDep)', () => {
      const existing = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.22.0' }
      });

      const incoming = JSON.stringify({
        devDependencies: { '@microsoft/sp-core-library': '1.23.0' }
      });

      expect(() => helper.merge(existing, incoming)).toThrow(
        /SPFx version mismatch for "@microsoft\/sp-core-library"/
      );
    });

    it('should throw when @microsoft/* version differs across dep types (devDep vs dep)', () => {
      const existing = JSON.stringify({
        devDependencies: { '@microsoft/spfx-heft-plugins': '1.22.0' }
      });

      const incoming = JSON.stringify({
        dependencies: { '@microsoft/spfx-heft-plugins': '1.23.0' }
      });

      expect(() => helper.merge(existing, incoming)).toThrow(
        /SPFx version mismatch for "@microsoft\/spfx-heft-plugins"/
      );
    });

    it('should include both versions in error message', () => {
      const existing = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.20.0' }
      });

      const incoming = JSON.stringify({
        dependencies: { '@microsoft/sp-core-library': '1.22.0' }
      });

      expect(() => helper.merge(existing, incoming)).toThrow(/1\.20\.0.*1\.22\.0/);
    });
  });

  describe('edge cases', () => {
    it('should handle empty dependency objects', () => {
      const existing = JSON.stringify({ dependencies: {}, devDependencies: {} });
      const incoming = JSON.stringify({ dependencies: {}, devDependencies: {} });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.dependencies).toEqual({});
      expect(result.devDependencies).toEqual({});
    });

    it('should preserve scripts and engines together from existing', () => {
      const existing = JSON.stringify({
        name: 'my-project',
        scripts: { build: 'tsc', test: 'jest' },
        engines: { node: '>=18', npm: '>=9' },
        dependencies: { lodash: '^4.17.0' }
      });

      const incoming = JSON.stringify({
        name: 'template',
        scripts: { build: 'webpack' },
        engines: { node: '>=20' },
        dependencies: { axios: '^1.0.0' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.scripts).toEqual({ build: 'tsc', test: 'jest' });
      expect(result.engines).toEqual({ node: '>=18', npm: '>=9' });
    });

    it('should not let incoming non-dep fields override existing metadata', () => {
      const existing = JSON.stringify({
        name: 'my-project',
        version: '2.0.0',
        description: 'My project',
        dependencies: {}
      });

      const incoming = JSON.stringify({
        name: 'template',
        version: '0.0.0',
        description: 'Template description',
        license: 'MIT',
        dependencies: { react: '^18.0.0' }
      });

      const result = JSON.parse(helper.merge(existing, incoming));

      expect(result.name).toBe('my-project');
      expect(result.version).toBe('2.0.0');
      expect(result.description).toBe('My project');
    });
  });
});
