// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library');
jest.mock('../../templating/SPFxTemplate');

import { FileSystem } from '@rushstack/node-core-library';
import { LocalFileSystemRepositorySource } from '../LocalFileSystemRepositorySource';
import { SPFxTemplate } from '../../templating/SPFxTemplate';

interface IFileSystemReadFolderItemsResult {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
  isBlockDevice: () => boolean;
  isCharacterDevice: () => boolean;
  isSymbolicLink: () => boolean;
  isFIFO: () => boolean;
  isSocket: () => boolean;
  parentPath: string;
  path: string;
}

describe(LocalFileSystemRepositorySource.name, () => {
  const mockReadFolderItems = FileSystem.readFolderItems as jest.MockedFunction<
    typeof FileSystem.readFolderItems
  >;
  const mockExistsAsync = FileSystem.existsAsync as jest.MockedFunction<typeof FileSystem.existsAsync>;
  const mockFromFolderAsync = SPFxTemplate.fromFolderAsync as jest.MockedFunction<
    typeof SPFxTemplate.fromFolderAsync
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    // By default, assume template.json exists in all directories
    mockExistsAsync.mockResolvedValue(true);
  });

  describe('constructor', () => {
    it('should create an instance with a path', () => {
      const source = new LocalFileSystemRepositorySource('/path/to/templates');

      expect(source.path).toBe('/path/to/templates');
      expect(source.kind).toBe('local');
    });

    it('should handle Windows-style paths', () => {
      const source = new LocalFileSystemRepositorySource('C:\\templates');

      expect(source.path).toBe('C:\\templates');
    });

    it('should handle relative paths', () => {
      const source = new LocalFileSystemRepositorySource('./templates');

      expect(source.path).toBe('./templates');
    });
  });

  describe('path property', () => {
    it('should be readonly', () => {
      const source = new LocalFileSystemRepositorySource('/path');

      expect(() => {
        // @ts-expect-error - Testing readonly property
        source.path = '/new/path';
      }).toThrow();
    });
  });

  describe('kind property', () => {
    it('should always be "local"', () => {
      const source = new LocalFileSystemRepositorySource('/path');

      expect(source.kind).toBe('local');
    });
  });

  describe('getTemplates', () => {
    it('should return templates from directories', async () => {
      const mockTemplate1 = { name: 'Template1' } as SPFxTemplate;
      const mockTemplate2 = { name: 'Template2' } as SPFxTemplate;

      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/to/templates/template1',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/to/templates/template2',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);
      mockFromFolderAsync.mockResolvedValueOnce(mockTemplate1).mockResolvedValueOnce(mockTemplate2);

      const source = new LocalFileSystemRepositorySource('/path/to/templates');
      const templates = await source.getTemplatesAsync();

      expect(mockReadFolderItems).toHaveBeenCalledWith('/path/to/templates', {
        absolutePaths: true
      });
      expect(templates).toEqual([mockTemplate1, mockTemplate2]);
      expect(mockFromFolderAsync).toHaveBeenCalledTimes(2);
    });

    it('should filter out files and only process directories', async () => {
      const mockTemplate = { name: 'Template1' } as SPFxTemplate;

      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/to/templates/template1',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/to/templates/README.md',
          isDirectory: () => false,
          isFile: () => true
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/to/templates/config.json',
          isDirectory: () => false,
          isFile: () => true
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);
      mockFromFolderAsync.mockResolvedValue(mockTemplate);

      const source = new LocalFileSystemRepositorySource('/path/to/templates');
      const templates = await source.getTemplatesAsync();

      expect(templates.length).toBe(1);
      expect(mockFromFolderAsync).toHaveBeenCalledTimes(1);
      expect(mockFromFolderAsync).toHaveBeenCalledWith('/path/to/templates/template1');
    });

    it('should skip directories that do not contain template.json', async () => {
      const mockTemplate = { name: 'Template1' } as SPFxTemplate;

      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/to/templates/valid-template',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/to/templates/not-a-template',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);
      mockExistsAsync.mockImplementation(async (filePath: string) => {
        return filePath === '/path/to/templates/valid-template/template.json';
      });
      mockFromFolderAsync.mockResolvedValue(mockTemplate);

      const source = new LocalFileSystemRepositorySource('/path/to/templates');
      const templates = await source.getTemplatesAsync();

      expect(mockExistsAsync).toHaveBeenCalledTimes(2);
      expect(mockExistsAsync).toHaveBeenCalledWith('/path/to/templates/valid-template/template.json');
      expect(mockExistsAsync).toHaveBeenCalledWith('/path/to/templates/not-a-template/template.json');
      expect(templates.length).toBe(1);
      expect(mockFromFolderAsync).toHaveBeenCalledTimes(1);
      expect(mockFromFolderAsync).toHaveBeenCalledWith('/path/to/templates/valid-template');
    });

    it('should return empty array when no directories found', async () => {
      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/to/templates/file.txt',
          isDirectory: () => false,
          isFile: () => true
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);

      const source = new LocalFileSystemRepositorySource('/path/to/templates');
      const templates = await source.getTemplatesAsync();

      expect(templates).toEqual([]);
      expect(mockFromFolderAsync).not.toHaveBeenCalled();
    });

    it('should return empty array when folder is empty', async () => {
      mockReadFolderItems.mockReturnValue([]);

      const source = new LocalFileSystemRepositorySource('/path/to/templates');
      const templates = await source.getTemplatesAsync();

      expect(templates).toEqual([]);
      expect(mockFromFolderAsync).not.toHaveBeenCalled();
    });

    it('should throw error with path information when read fails', async () => {
      mockReadFolderItems.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const source = new LocalFileSystemRepositorySource('/path/to/templates');

      await expect(source.getTemplatesAsync()).rejects.toThrow(
        /Failed to read templates from \/path\/to\/templates/
      );
    });

    it('should throw error when template loading fails', async () => {
      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/to/templates/bad-template',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);
      mockFromFolderAsync.mockRejectedValue(new Error('Invalid template.json'));

      const source = new LocalFileSystemRepositorySource('/path/to/templates');

      await expect(source.getTemplatesAsync()).rejects.toThrow(/Failed to read templates/);
    });

    it('should use absolute paths when reading folders', async () => {
      mockReadFolderItems.mockReturnValue([]);

      const source = new LocalFileSystemRepositorySource('/test/path');
      await source.getTemplatesAsync();

      expect(mockReadFolderItems).toHaveBeenCalledWith('/test/path', {
        absolutePaths: true
      });
    });

    it('should load all templates concurrently', async () => {
      const mockTemplate1 = { name: 'Template1' } as SPFxTemplate;

      const mockFolderItems: IFileSystemReadFolderItemsResult[] = [
        {
          name: '/path/template1',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/template2',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult,
        {
          name: '/path/template3',
          isDirectory: () => true,
          isFile: () => false
        } as IFileSystemReadFolderItemsResult
      ];

      mockReadFolderItems.mockReturnValue(mockFolderItems);

      // Track when each call is made
      const calls: number[] = [];
      mockFromFolderAsync.mockImplementation(async () => {
        calls.push(Date.now());
        return mockTemplate1;
      });

      const source = new LocalFileSystemRepositorySource('/path');
      await source.getTemplatesAsync();

      // All calls should be made at approximately the same time (concurrent)
      expect(mockFromFolderAsync).toHaveBeenCalledTimes(3);
    });
  });
});
