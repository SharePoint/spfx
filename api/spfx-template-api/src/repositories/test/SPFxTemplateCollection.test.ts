// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { SPFxTemplateCollection } from '../SPFxTemplateCollection';
import { SPFxTemplate } from '../../templating';
import { SPFxTemplateJsonFile } from '../../templating';

describe('SPFxTemplateCollection', () => {
  describe('constructor', () => {
    it('should create an empty collection from empty array', () => {
      const collection = new SPFxTemplateCollection([]);

      expect(collection.size).toBe(0);
    });

    it('should create a collection from array of templates', () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template1',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template2',
          version: '2.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const collection = new SPFxTemplateCollection([template1, template2]);

      expect(collection.size).toBe(2);
      expect(collection.get('Template1')).toBe(template1);
      expect(collection.get('Template2')).toBe(template2);
    });

    it('should use template name as map key', () => {
      const template = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'MyTemplate',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const collection = new SPFxTemplateCollection([template]);

      expect(collection.has('MyTemplate')).toBe(true);
      expect(collection.get('MyTemplate')).toBe(template);
    });

    it('should handle duplicate template names (last one wins)', () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'DuplicateName',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'DuplicateName',
          version: '2.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const collection = new SPFxTemplateCollection([template1, template2]);

      expect(collection.size).toBe(1);
      expect(collection.get('DuplicateName')).toBe(template2);
      expect(collection.get('DuplicateName')?.version).toBe('2.0.0');
    });
  });

  describe('Map functionality', () => {
    let collection: SPFxTemplateCollection;
    let template1: SPFxTemplate;
    let template2: SPFxTemplate;

    beforeEach(() => {
      template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template1',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template2',
          version: '2.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      collection = new SPFxTemplateCollection([template1, template2]);
    });

    it('should support has() method', () => {
      expect(collection.has('Template1')).toBe(true);
      expect(collection.has('Template2')).toBe(true);
      expect(collection.has('NonExistent')).toBe(false);
    });

    it('should support get() method', () => {
      expect(collection.get('Template1')).toBe(template1);
      expect(collection.get('Template2')).toBe(template2);
      expect(collection.get('NonExistent')).toBeUndefined();
    });

    it('should support keys() method', () => {
      const keys = Array.from(collection.keys());
      expect(keys).toContain('Template1');
      expect(keys).toContain('Template2');
      expect(keys.length).toBe(2);
    });

    it('should support values() method', () => {
      const values = Array.from(collection.values());
      expect(values).toContain(template1);
      expect(values).toContain(template2);
      expect(values.length).toBe(2);
    });

    it('should support entries() method', () => {
      const entries = Array.from(collection.entries());
      expect(entries).toContainEqual(['Template1', template1]);
      expect(entries).toContainEqual(['Template2', template2]);
      expect(entries.length).toBe(2);
    });

    it('should support forEach() method', () => {
      const visited: string[] = [];
      collection.forEach((template, name) => {
        visited.push(name);
      });

      expect(visited).toContain('Template1');
      expect(visited).toContain('Template2');
      expect(visited.length).toBe(2);
    });

    it('should be iterable', () => {
      const names: string[] = [];
      for (const [name] of collection) {
        names.push(name);
      }

      expect(names).toContain('Template1');
      expect(names).toContain('Template2');
      expect(names.length).toBe(2);
    });
  });

  describe('toString', () => {
    it('should show count for empty collection', () => {
      const collection = new SPFxTemplateCollection([]);
      const result = collection.toString();

      expect(result).toContain('# of templates: 0');
    });

    it('should show count and template details', () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'WebPart',
          description: 'A web part template',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map([['file.txt', 'content']])
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Extension',
          version: '2.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const collection = new SPFxTemplateCollection([template1, template2]);
      const result = collection.toString();

      expect(result).toContain('# of templates: 2');
      expect(result).toContain('Template Name: WebPart');
      expect(result).toContain('Template Name: Extension');
    });

    it('should include template details for each template', () => {
      const template = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'DetailedTemplate',
          description: 'A detailed template',
          version: '3.2.1',
          spfxVersion: '1.19.0'
        }),
        new Map([
          ['file1.txt', 'content1'],
          ['file2.txt', 'content2']
        ])
      );

      const collection = new SPFxTemplateCollection([template]);
      const result = collection.toString();

      expect(result).toContain('Template Name: DetailedTemplate');
      expect(result).toContain('Description: A detailed template');
      expect(result).toContain('Version: 3.2.1');
      expect(result).toContain('SPFx Version: 1.19.0');
      expect(result).toContain('Number of Files: 2');
    });

    it('should separate template details with newlines', () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'First',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Second',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const collection = new SPFxTemplateCollection([template1, template2]);
      const result = collection.toString();

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(5); // Count + 2 templates with multiple lines each
    });
  });
});
