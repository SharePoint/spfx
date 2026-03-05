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
  type ISPFxTemplateJson
} from '../SPFxTemplateJsonFile';

describe('SPFxTemplateJsonFile', () => {
  const mockReadFileAsync = FileSystem.readFileAsync as jest.MockedFunction<typeof FileSystem.readFileAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with valid data', () => {
      const data: ISPFxTemplateJson = {
        name: 'Test Template',
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
        description: 'A test template',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        contextSchema: {
          componentName: {
            type: 'string',
            description: 'The name of the component'
          }
        }
      };

      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.description).toBe('A test template');
      expect(instance.contextSchema).toEqual({
        componentName: {
          type: 'string',
          description: 'The name of the component'
        }
      });
    });
  });

  describe('property getters', () => {
    it('should return the correct name', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.name).toBe('My Template');
    });

    it('should return undefined for missing description', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        version: '2.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.description).toBeUndefined();
    });

    it('should return the correct version', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        version: '1.2.3',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.version).toBe('1.2.3');
    });

    it('should return the correct spfxVersion', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        version: '1.0.0',
        spfxVersion: '1.19.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.spfxVersion).toBe('1.19.0');
    });

    it('should return undefined for missing contextSchema', () => {
      const data: ISPFxTemplateJson = {
        name: 'My Template',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };
      const instance = new SPFxTemplateJsonFile(data);

      expect(instance.contextSchema).toBeUndefined();
    });
  });

  describe('fromFileAsync', () => {
    it('should create an instance from a valid file', async () => {
      const validJson = {
        name: 'File Template',
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
        description: 'A complete template with all fields',
        version: '1.2.3',
        spfxVersion: '1.18.0',
        contextSchema: {
          componentName: {
            type: 'string',
            description: 'Component name'
          },
          componentDescription: {
            type: 'string',
            description: 'Component description'
          }
        }
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject name that is too short', () => {
      const data = {
        name: 'AB', // Less than 3 characters
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'A'.repeat(101), // More than 100 characters
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description that is too long', () => {
      const data = {
        name: 'Valid Name',
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
        version: 'not-a-version',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid spfxVersion format', () => {
      const data = {
        name: 'Valid Name',
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
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const testCases = [
        { version: '1.0.0', spfxVersion: '1.18.0' }, // Missing name
        { name: 'Test', spfxVersion: '1.18.0' }, // Missing version
        { name: 'Test', version: '1.0.0' } // Missing spfxVersion
      ];

      testCases.forEach((data) => {
        const result = SPFxTemplateDefinitionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it('should reject extra fields due to strict mode', () => {
      const data = {
        name: 'Valid Name',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        extraField: 'not allowed'
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid contextSchema type', () => {
      const data = {
        name: 'Valid Name',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        contextSchema: {
          field: {
            type: 'number', // Only 'string' is allowed
            description: 'A field'
          }
        }
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject contextSchema without description', () => {
      const data = {
        name: 'Valid Name',
        version: '1.0.0',
        spfxVersion: '1.18.0',
        contextSchema: {
          field: {
            type: 'string'
            // Missing description
          }
        }
      };

      const result = SPFxTemplateDefinitionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
