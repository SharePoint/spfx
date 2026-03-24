// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import {
  BaseSPFxTemplateRepositorySource,
  type SPFxTemplateRepositorySourceKind
} from '../SPFxTemplateRepositorySource';
import type { SPFxTemplate } from '../../templating/SPFxTemplate';

// Create a concrete implementation for testing
class TestRepositorySource extends BaseSPFxTemplateRepositorySource {
  private _templates: SPFxTemplate[];

  public constructor(kind: SPFxTemplateRepositorySourceKind, templates: SPFxTemplate[] = []) {
    super(kind);
    this._templates = templates;
  }

  public override async getTemplatesAsync(): Promise<Array<SPFxTemplate>> {
    return this._templates;
  }
}

describe(BaseSPFxTemplateRepositorySource.name, () => {
  describe('constructor', () => {
    it('should create an instance with local kind', () => {
      const source = new TestRepositorySource('local');

      expect(source.kind).toBe('local');
    });

    it('should create an instance with github kind', () => {
      const source = new TestRepositorySource('github');

      expect(source.kind).toBe('github');
    });
  });

  describe('kind property', () => {
    it('should return the correct kind value', () => {
      const localSource = new TestRepositorySource('local');
      const githubSource = new TestRepositorySource('github');

      expect(localSource.kind).toBe('local');
      expect(githubSource.kind).toBe('github');
    });
  });

  describe(TestRepositorySource.prototype.getTemplatesAsync.name, () => {
    it('should be implemented by concrete class', async () => {
      const source = new TestRepositorySource('local');

      expect(source.getTemplatesAsync).toBeDefined();
      expect(typeof source.getTemplatesAsync).toBe('function');
    });

    it('should return a promise', () => {
      const source = new TestRepositorySource('local');
      const result = source.getTemplatesAsync();

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to an array', async () => {
      const source = new TestRepositorySource('local');
      const result = await source.getTemplatesAsync();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
