// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library', () => ({
  FileSystem: {
    readFileAsync: jest.fn()
  }
}));

import * as path from 'node:path';
import { FileSystem } from '@rushstack/node-core-library';
import {
  SPFxTemplateJsonFile,
  SPFxTemplateDefinitionSchema,
  SPFX_TEMPLATE_CATEGORIES,
  type ISPFxTemplateJson
} from '../SPFxTemplateJsonFile';

describe(SPFxTemplateJsonFile.name, () => {
  const mockReadFileAsync = FileSystem.readFileAsync as jest.MockedFunction<typeof FileSystem.readFileAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with valid data', () => {
      const data: ISPFxTemplateJson = {
        name: 'Test Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.name).toBe('Test Template');
      expect(instance.version).toBe('1.0.0');
      expect(instance.spfxVersion).toBe('1.18.0');
    });

    it('should create an instance with optional fields', () => {
      const data: ISPFxTemplateJson = {
        name: 'Test Template',
        category: 'extension',
        description: 'A test template',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.description).toBe('A test template');
    });
  });

  describe('property getters', () => {
    it('should return the correct name', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.name).toBe('My Template');
    });

    it('should return the correct category', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'extension',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.category).toBe('extension');
    });

    it('should return undefined for missing description', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.description).toBeUndefined();
    });

    it('should return the correct version', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '1.2.3',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.version).toBe('1.2.3');
    });

    it('should return the correct spfxVersion', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.19.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.spfxVersion).toBe('1.19.0');
    });

    it('should return the correct minimumEngineVersion', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        minimumEngineVersion: '0.2.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.minimumEngineVersion).toBe('0.2.0');
    });

    it('should return undefined for missing minimumEngineVersion', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.minimumEngineVersion).toBeUndefined();
    });

    it('should detect unknown fields from passthrough data', () => {
      // Simulate what Zod .passthrough() produces: extra runtime keys
      const data = {
        name: 'My Template',
        category: 'webpart' as const,
        version: '1.0.0',
        spfxVersion: '1.18.0',
        futureField: 'something',
        anotherFutureField: 42
      } as ISPFxTemplateJson;
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.unknownFields).toEqual(['futureField', 'anotherFutureField']);
    });

    it('should return empty unknownFields for known-only fields', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        minimumEngineVersion: '0.1.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.unknownFields).toEqual([]);
    });
  });

  describe('fromFileAsync', () => {
    it('should create an instance from a valid file', async () => {
      const validJson = {
        name: 'File Template',
        category: 'webpart',
        description: 'Template from file',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockResolvedValue(JSON.stringify(validJson));

      const instance = await SPFxTemplateJsonFile.fromFileAsync('/path/to/template.json');

      expect(mockReadFileAsync).toHaveBeenCalledWith('/path/to/template.json');
      expect(instance.name).toBe('File Template');
      expect(instance.description).toBe('Template from file');
      expect(instance.version).toBe('1.0.0');
      expect(instance.spfxVersion).toBe('1.18.0');
    });

    it('should throw an error for invalid JSON', async () => {
      mockReadFileAsync.mockResolvedValue('invalid json {');

      await expect(SPFxTemplateJsonFile.fromFileAsync('/path/to/invalid.json')).rejects.toThrow();
    });

    it('should throw an error when validation fails', async () => {
      const invalidData = {
        name: 'AB', // Too short (min 3 chars)
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockResolvedValue(JSON.stringify(invalidData));

      await expect(SPFxTemplateJsonFile.fromFileAsync('/path/to/invalid.json')).rejects.toThrow(
        /Invalid template.json file/
      );
    });

    it('should throw an error for missing required fields', async () => {
      const incompleteData = {
        name: 'Test Template'
        // Missing version and spfxVersion
      };

      mockReadFileAsync.mockResolvedValue(JSON.stringify(incompleteData));

      await expect(SPFxTemplateJsonFile.fromFileAsync('/path/to/incomplete.json')).rejects.toThrow(
        /Invalid template.json file/
      );
    });
  });

  describe('fromFolderAsync', () => {
    it('should create an instance from a folder containing template.json', async () => {
      const validJson = {
        name: 'Folder Template',
        category: 'extension',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockResolvedValue(JSON.stringify(validJson));

      const instance = await SPFxTemplateJsonFile.fromFolderAsync('/path/to/folder');

      const expectedPath = path.join('/path/to/folder', 'template.json');
      expect(mockReadFileAsync).toHaveBeenCalledWith(expectedPath);
      expect(instance.name).toBe('Folder Template');
    });

    it('should handle folder paths with different separators', async () => {
      const validJson = {
        name: 'Test',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      mockReadFileAsync.mockResolvedValue(JSON.stringify(validJson));

      await SPFxTemplateJsonFile.fromFolderAsync('C:\\folder\\subfolder');

      const expectedPath = path.join('C:\\folder\\subfolder', 'template.json');
      expect(mockReadFileAsync).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('TEMPLATE_JSON constant', () => {
    it('should have the correct value', () => {
      expect(SPFxTemplateJsonFile.TEMPLATE_JSON).toBe('template.json');
    });
  });
});

describe('SPFxTemplateDefinitionSchema', () => {
  describe('validation', () => {
    it('should validate minimal valid template', () => {
      const data = {
        name: 'Valid Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate template with all optional fields', () => {
      const data = {
        $schema: 'https://example.com/schema.json',
        name: 'Complete Template',
        category: 'ace',
        description: 'A complete template with all fields',
        version: '1.2.3',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject name that is too short', () => {
      const data = {
        name: 'AB', // Less than 3 characters
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'A'.repeat(101), // More than 100 characters
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description that is too long', () => {
      const data = {
        name: 'Valid Name',
        category: 'webpart',
        description: 'A'.repeat(501), // More than 500 characters
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid version format', () => {
      const data = {
        name: 'Valid Name',
        category: 'webpart',
        version: 'not-a-version',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid spfxVersion format', () => {
      const data = {
        name: 'Valid Name',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: 'invalid'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid semantic versions', () => {
      const versions = ['1.0.0', '0.0.1', '10.20.30', '1.0.0-alpha', '1.0.0-beta.1'];

      versions.forEach((version) => {
        const data = {
          name: 'Test',
          category: 'webpart' as const,
          version,
          spfxVersion: version
        };

        const result = SPFxTemplateDefinitionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid $schema URL', () => {
      const data = {
        $schema: 'not-a-url',
        name: 'Valid Name',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const testCases = [
        { category: 'webpart', version: '1.0.0', spfxVersion: '1.18.0' }, // Missing name
        { name: 'Test', category: 'webpart', spfxVersion: '1.18.0' }, // Missing version
        { name: 'Test', category: 'webpart', version: '1.0.0' }, // Missing spfxVersion
        { name: 'Test', version: '1.0.0', spfxVersion: '1.18.0' } // Missing category
      ];

      testCases.forEach((data) => {
        const result = SPFxTemplateDefinitionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it('should accept extra fields (passthrough mode for forward compatibility)', () => {
      const data = {
        name: 'Valid Name',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        extraField: 'allowed now'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate template with minimumEngineVersion', () => {
      const data = {
        name: 'Valid Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        minimumEngineVersion: '0.2.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid minimumEngineVersion format', () => {
      const data = {
        name: 'Valid Template',
        category: 'webpart',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        minimumEngineVersion: 'not-a-version'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate all valid category values', () => {
      SPFX_TEMPLATE_CATEGORIES.forEach((category) => {
        const data = {
          name: 'Test',
          category,
          version: '1.0.0',
          spfxVersion: '1.18.0'
        };
        const result = SPFxTemplateDefinitionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid category value', () => {
      const data = {
        name: 'Valid Name',
        category: 'invalid-category',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
