// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library');
jest.mock('mem-fs');
jest.mock('mem-fs-editor');

import type { MemFsEditor } from 'mem-fs-editor';

import { Async, FileSystem, type FolderItem } from '@rushstack/node-core-library';

import { SPFxTemplate } from '../SPFxTemplate';
import { SPFxTemplateJsonFile } from '../SPFxTemplateJsonFile';

describe(SPFxTemplate.name, () => {
  const mockReadFileAsync = jest.mocked(FileSystem.readFileAsync);
  const mockReadFolderItemsAsync = jest.mocked(FileSystem.readFolderItemsAsync);
  const mockForEachAsync = jest.mocked(Async.forEachAsync);

  beforeEach(() => {
    jest.clearAllMocks();
    // Make Async.forEachAsync actually call the callback so file reads are exercised
    mockForEachAsync.mockImplementation(async (items, callback) => {
      for (const item of items as unknown[]) {
        await callback(item as never, 0);
      }
    });
  });

  describe('constructor', () => {
    it('should create an instance with definition and files', () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Test Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, Buffer | string>([
        ['file1.txt', 'content1'],
        ['file2.txt', 'content2']
      ]);

      const template = new SPFxTemplate(definition, files);

      expect(template.name).toBe('Test Template');
      expect(template.version).toBe('1.0.0');
      expect(template.spfxVersion).toBe('1.18.0');
    });
  });

  describe('property getters', () => {
    let template: SPFxTemplate;

    beforeEach(() => {
      const definition = new SPFxTemplateJsonFile({
        name: 'My Template',
        category: 'extension',
        description: 'A test template',
        version: '2.0.0',
        spfxVersion: '1.19.0'
      });

      template = new SPFxTemplate(definition, new Map());
    });

    it('should return the correct name', () => {
      expect(template.name).toBe('My Template');
    });

    it('should return the correct category', () => {
      expect(template.category).toBe('extension');
    });

    it('should return the correct description', () => {
      expect(template.description).toBe('A test template');
    });

    it('should return the correct version', () => {
      expect(template.version).toBe('2.0.0');
    });

    it('should return the correct spfxVersion', () => {
      expect(template.spfxVersion).toBe('1.19.0');
    });

    it('should return undefined for missing description', () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'No Desc',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const templateNoDesc = new SPFxTemplate(definition, new Map());
      expect(templateNoDesc.description).toBeUndefined();
    });
  });

  describe('fromFolderAsync', () => {
    it('should create a template from a folder', async () => {
      const templateJson = {
        name: 'Folder Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      // Mock template.json read (via readFileAsync)
      mockReadFileAsync.mockImplementation(async (filePath: string) => {
        if (filePath.includes('template.json')) {
          return JSON.stringify(templateJson);
        }
        return 'file content';
      });

      // Mock folder structure
      const rootItems: FolderItem[] = [
        {
          name: 'template.json',
          isFile: () => true,
          isDirectory: () => false
        } as FolderItem,
        { name: 'src', isFile: () => false, isDirectory: () => true } as FolderItem,
        {
          name: 'README.md',
          isFile: () => true,
          isDirectory: () => false
        } as FolderItem
      ];

      const srcItems: FolderItem[] = [
        { name: 'index.ts', isFile: () => true, isDirectory: () => false } as FolderItem
      ];

      mockReadFolderItemsAsync.mockImplementation(async (folderPath: string) => {
        if (folderPath.endsWith('src')) {
          return srcItems;
        }
        return rootItems;
      });

      const template = await SPFxTemplate.fromFolderAsync('/test/folder');

      expect(template.name).toBe('Folder Template');
      expect(template.version).toBe('1.0.0');
      expect(mockReadFolderItemsAsync).toHaveBeenCalled();
    });

    it('should exclude template.json from files map', async () => {
      const templateJson = {
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockImplementation(async (filePath: string) => {
        if (filePath.includes('template.json')) {
          return JSON.stringify(templateJson);
        }
        return 'file content';
      });

      const rootItems: FolderItem[] = [
        {
          name: 'template.json',
          isFile: () => true,
          isDirectory: () => false
        } as FolderItem,
        {
          name: 'other.txt',
          isFile: () => true,
          isDirectory: () => false
        } as FolderItem
      ];

      mockReadFolderItemsAsync.mockResolvedValue(rootItems);

      await SPFxTemplate.fromFolderAsync('/test/folder');

      // Verify non-template.json text files were read as strings
      expect(mockReadFileAsync).toHaveBeenCalledWith(expect.stringContaining('other.txt'));
    });

    it('should handle nested directories', async () => {
      const templateJson = {
        name: 'Nested Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockImplementation(async (filePath: string) => {
        if (filePath.includes('template.json')) {
          return JSON.stringify(templateJson);
        }
        return `content of ${filePath}`;
      });

      const rootItems: FolderItem[] = [
        {
          name: 'template.json',
          isFile: () => true,
          isDirectory: () => false
        } as FolderItem,
        { name: 'level1', isFile: () => false, isDirectory: () => true } as FolderItem
      ];

      const level1Items: FolderItem[] = [
        { name: 'level2', isFile: () => false, isDirectory: () => true } as FolderItem
      ];

      const level2Items: FolderItem[] = [
        { name: 'deep.txt', isFile: () => true, isDirectory: () => false } as FolderItem
      ];

      mockReadFolderItemsAsync.mockImplementation(async (folderPath: string) => {
        if (folderPath.includes('level2')) {
          return level2Items;
        }
        if (folderPath.includes('level1')) {
          return level1Items;
        }
        return rootItems;
      });

      const template = await SPFxTemplate.fromFolderAsync('/test/folder');
      expect(template.name).toBe('Nested Template');
    });
  });

  describe('fromMemoryAsync', () => {
    it('should create a template from memory', async () => {
      const templateJsonData = {
        name: 'Memory Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const fileMap = new Map<string, Buffer>([
        ['template.json', Buffer.from(JSON.stringify(templateJsonData))],
        ['src/index.ts', Buffer.from('console.log("hello");')],
        ['README.md', Buffer.from('# README')]
      ]);

      const template = await SPFxTemplate.fromMemoryAsync('Memory Template', templateJsonData, fileMap);

      expect(template.name).toBe('Memory Template');
      expect(template.version).toBe('1.0.0');
    });

    it('should exclude template.json from files', async () => {
      const templateJsonData = {
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const fileMap = new Map<string, Buffer>([
        ['template.json', Buffer.from(JSON.stringify(templateJsonData))],
        ['other.txt', Buffer.from('content')]
      ]);

      const template = await SPFxTemplate.fromMemoryAsync('Test', templateJsonData, fileMap);

      // template.json should not be in the files map
      expect(template.toString()).toContain('Number of Files: 1');
    });

    it('should throw error for invalid template.json data', async () => {
      const invalidData = {
        name: 'AB', // Too short
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const fileMap = new Map<string, Buffer>();

      await expect(SPFxTemplate.fromMemoryAsync('Invalid', invalidData, fileMap)).rejects.toThrow(
        /Invalid template.json/
      );
    });

    it('should handle empty file map', async () => {
      const templateJsonData = {
        name: 'Empty',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const fileMap = new Map<string, Buffer>();

      const template = await SPFxTemplate.fromMemoryAsync('Empty', templateJsonData, fileMap);

      expect(template.name).toBe('Empty');
      expect(template.toString()).toContain('Number of Files: 0');
    });
  });

  describe('render', () => {
    it('should render template without context schema', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Simple',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, string | Buffer>([
        ['src/index.ts', 'const name = "<%= name %>";'],
        ['README.md', '# <%= title %>']
      ]);

      const template = new SPFxTemplate(definition, files);
      const context = { name: 'MyApp', title: 'My Application' };

      const editor: MemFsEditor = await template.renderAsync(context, '/output');

      expect(editor.read('/output/src/index.ts')).toBe('const name = "MyApp";');
      expect(editor.read('/output/README.md')).toBe('# My Application');
    });

    it('should render template with context schema validation', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'WithSchema',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        contextSchema: {
          componentName: {
            type: 'string',
            description: 'Component name'
          }
        }
      });

      const files = new Map<string, string | Buffer>([
        ['src/index.ts', 'const name = "<%= componentName %>";']
      ]);

      const template = new SPFxTemplate(definition, files);
      const context = { componentName: 'MyComponent' };

      const editor: MemFsEditor = await template.renderAsync(context, '/output');

      expect(editor.read('/output/src/index.ts')).toBe('const name = "MyComponent";');
    });

    it('should throw error when context does not match schema', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'WithSchema',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        contextSchema: {
          requiredField: {
            type: 'string',
            description: 'A required field'
          }
        }
      });

      const files = new Map<string, string | Buffer>([['file.txt', 'content']]);

      const template = new SPFxTemplate(definition, files);
      const invalidContext = { wrongField: 'value' };

      await expect(template.renderAsync(invalidContext, '/output')).rejects.toThrow(/Invalid context object/);
    });

    it('should replace placeholders in filenames', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, string | Buffer>([
        ['src/{componentName}.ts', 'export class <%= componentName %> {}']
      ]);

      const template = new SPFxTemplate(definition, files);
      const context = { componentName: 'MyComponent' };

      const editor: MemFsEditor = await template.renderAsync(context, '/output');

      expect(editor.read('/output/src/MyComponent.ts')).toBe('export class MyComponent {}');
    });

    it('should process EJS templates in file contents', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, string | Buffer>([
        ['file.txt', 'Hello <%= name %>!'],
        ['config.json', '{"version": "<%= version %>"}']
      ]);

      const template = new SPFxTemplate(definition, files);
      const context = { name: 'World', version: '1.0.0' };

      const editor: MemFsEditor = await template.renderAsync(context, '/output');

      expect(editor.read('/output/file.txt')).toBe('Hello World!');
      expect(editor.read('/output/config.json')).toBe('{"version": "1.0.0"}');
    });

    it('should return MemFsEditor instance', async () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const template = new SPFxTemplate(definition, new Map());
      const result: MemFsEditor = await template.renderAsync({}, '/output');

      expect(result).toBeDefined();
      expect(typeof result.read).toBe('function');
      expect(typeof result.write).toBe('function');
      expect(typeof result.commit).toBe('function');
    });
  });

  describe('toString', () => {
    it('should return formatted template information', () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'My Template',
        category: 'webpart',
        description: 'A test template',
        version: '1.2.3',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, string | Buffer>([
        ['file1.txt', 'content1'],
        ['file2.txt', 'content2'],
        ['file3.txt', 'content3']
      ]);

      const template = new SPFxTemplate(definition, files);
      const result = template.toString();

      expect(result).toContain('Template Name: My Template');
      expect(result).toContain('Category: webpart');
      expect(result).toContain('Description: A test template');
      expect(result).toContain('Version: 1.2.3');
      expect(result).toContain('SPFx Version: 1.18.0');
      expect(result).toContain('Number of Files: 3');
    });

    it('should show "N/A" for missing description', () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'No Description',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const template = new SPFxTemplate(definition, new Map());
      const result = template.toString();

      expect(result).toContain('Description: N/A');
    });

    it('should show correct file count', () => {
      const definition = new SPFxTemplateJsonFile({
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      });

      const files = new Map<string, string | Buffer>();
      for (let i = 0; i < 10; i++) {
        files.set(`file${i}.txt`, 'content');
      }

      const template = new SPFxTemplate(definition, files);
      const result = template.toString();

      expect(result).toContain('Number of Files: 10');
    });
  });
});
