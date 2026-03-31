// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library', () => {
  const actual = jest.requireActual('@rushstack/node-core-library');
  return {
    ...actual,
    FileSystem: {
      readFileAsync: jest.fn(),
      readFileToBufferAsync: jest.fn(),
      writeFileAsync: jest.fn().mockResolvedValue(undefined),
      isNotExistError: (error: { code?: string }) => error?.code === 'ENOENT'
    }
  };
});

import { FileSystem } from '@rushstack/node-core-library';

import { TemplateOutput } from '../TemplateOutput';
import { SPFxTemplateWriter } from '../SPFxTemplateWriter';

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe(SPFxTemplateWriter.name, () => {
  let templateFs: TemplateOutput;

  beforeEach(() => {
    jest.clearAllMocks();
    templateFs = new TemplateOutput();
    mockFileSystem.writeFileAsync.mockResolvedValue(undefined);
  });

  it('should write new files to disk', async () => {
    templateFs.write('src/newFile.ts', 'new content');
    mockFileSystem.readFileAsync.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(
      expect.stringContaining('newFile.ts'),
      'new content',
      { ensureFolderExists: true }
    );
  });

  it('should route modified package.json through merge helper', async () => {
    const existingPkg = JSON.stringify({
      name: 'existing',
      dependencies: { lodash: '^4.17.0' }
    });

    const incomingPkg = JSON.stringify({
      name: 'incoming',
      dependencies: { axios: '^1.0.0' }
    });

    templateFs.write('package.json', incomingPkg);
    mockFileSystem.readFileAsync.mockResolvedValue(existingPkg);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledTimes(1);
    const writtenContent = JSON.parse(mockFileSystem.writeFileAsync.mock.calls[0]![1] as string);
    expect(writtenContent.name).toBe('existing');
    expect(writtenContent.dependencies.lodash).toBe('^4.17.0');
    expect(writtenContent.dependencies.axios).toBe('^1.0.0');
  });

  it('should preserve existing content when no merge helper exists and content differs', async () => {
    const existingContent = '{"old": true}';
    templateFs.write('some/unknown/file.json', '{"new": true}');
    mockFileSystem.readFileAsync.mockResolvedValue(existingContent);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    // Should NOT write — existing content is preserved by skipping
    expect(mockFileSystem.writeFileAsync).not.toHaveBeenCalled();
  });

  it('should skip silently when content is same without merge helper', async () => {
    const sameContent = '{"key": "value"}';
    templateFs.write('some/unknown/file.json', sameContent);
    mockFileSystem.readFileAsync.mockResolvedValue(sameContent);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).not.toHaveBeenCalled();
  });

  it('should handle mixed new and modified files', async () => {
    const existingConfig = JSON.stringify({
      $schema: 'https://schema.example.com',
      bundles: { 'old-bundle': {} },
      localizedResources: {},
      externals: {}
    });

    const incomingConfig = JSON.stringify({
      bundles: { 'new-bundle': {} },
      localizedResources: {},
      externals: {}
    });

    templateFs.write('src/newComponent.ts', 'export class NewComponent {}');
    templateFs.write('config/config.json', incomingConfig);

    mockFileSystem.readFileAsync.mockImplementation(async (filePath: string) => {
      if (filePath.includes('config.json')) {
        return existingConfig;
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    // Both files should be written
    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledTimes(2);

    // Find the config.json write call and verify it was merged
    const configCall = mockFileSystem.writeFileAsync.mock.calls.find((c) =>
      String(c[0]).includes('config.json')
    );
    const writtenContent = JSON.parse(String(configCall?.[1]));
    expect(writtenContent.bundles['old-bundle']).toBeDefined();
    expect(writtenContent.bundles['new-bundle']).toBeDefined();
  });

  it('should allow adding custom merge helpers', async () => {
    const existingContent = 'existing';
    const incomingContent = 'incoming';

    templateFs.write('custom/file.txt', incomingContent);
    mockFileSystem.readFileAsync.mockResolvedValue(existingContent);

    const writer = new SPFxTemplateWriter();
    writer.addMergeHelper({
      fileRelativePath: 'custom/file.txt',
      merge: (existing: string, incoming: string) => `${existing}+${incoming}`
    });
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(
      expect.stringContaining('file.txt'),
      'existing+incoming',
      { ensureFolderExists: true }
    );
  });

  it('should handle empty file system without errors', async () => {
    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).not.toHaveBeenCalled();
  });

  it('should write new binary files to disk', async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    templateFs.write('assets/logo.png', buffer);
    mockFileSystem.readFileToBufferAsync.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    );

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(expect.stringContaining('logo.png'), buffer, {
      ensureFolderExists: true
    });
  });

  it('should overwrite binary files when content differs', async () => {
    const newBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    const existingBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    templateFs.write('assets/logo.png', newBuffer);
    mockFileSystem.readFileToBufferAsync.mockResolvedValue(existingBuffer);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(
      expect.stringContaining('logo.png'),
      newBuffer,
      { ensureFolderExists: true }
    );
  });

  it('should skip binary files when content is identical', async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    templateFs.write('assets/logo.png', buffer);
    mockFileSystem.readFileToBufferAsync.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, '/target');

    expect(mockFileSystem.writeFileAsync).not.toHaveBeenCalled();
  });

  describe('error propagation', () => {
    it('should propagate error when writeFileAsync rejects', async () => {
      templateFs.write('file.txt', 'content');
      mockFileSystem.readFileAsync.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFileSystem.writeFileAsync.mockRejectedValue(new Error('EACCES: permission denied'));

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(templateFs, '/target')).rejects.toThrow('EACCES');
    });

    it('should propagate non-ENOENT readFile errors instead of treating as new file', async () => {
      templateFs.write('file.txt', 'content');
      mockFileSystem.readFileAsync.mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }));

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(templateFs, '/target')).rejects.toThrow('EACCES');
      expect(mockFileSystem.writeFileAsync).not.toHaveBeenCalled();
    });

    it('should propagate error when a merge helper merge() throws', async () => {
      templateFs.write('package.json', 'not valid json');
      mockFileSystem.readFileAsync.mockResolvedValue('{"name": "existing"}');

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(templateFs, '/target')).rejects.toThrow(SyntaxError);
    });

    it('should throw on path traversal attempts', async () => {
      templateFs.write('../escape.txt', 'malicious');

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(templateFs, '/target')).rejects.toThrow(/escapes the target directory/);
    });
  });

  describe(`${SPFxTemplateWriter.prototype.addMergeHelper.name} behavior`, () => {
    it('should match merge helpers after normalizing leading slashes', async () => {
      const existingPkg = JSON.stringify({ name: 'existing', dependencies: {} });
      const incomingPkg = JSON.stringify({ name: 'incoming', dependencies: { axios: '^1.0.0' } });

      // Write with leading slash — should still match the 'package.json' merge helper
      templateFs.write('/package.json', incomingPkg);
      mockFileSystem.readFileAsync.mockResolvedValue(existingPkg);

      const writer = new SPFxTemplateWriter();
      await writer.writeAsync(templateFs, '/target');

      expect(mockFileSystem.writeFileAsync).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(mockFileSystem.writeFileAsync.mock.calls[0]![1] as string);
      expect(writtenContent.name).toBe('existing');
      expect(writtenContent.dependencies.axios).toBe('^1.0.0');
    });

    it('should replace a built-in helper when registering for the same path', async () => {
      const existingPkg = JSON.stringify({ name: 'existing', dependencies: {} });
      const incomingPkg = JSON.stringify({ name: 'incoming', dependencies: {} });

      templateFs.write('package.json', incomingPkg);
      mockFileSystem.readFileAsync.mockResolvedValue(existingPkg);

      const writer = new SPFxTemplateWriter();
      writer.addMergeHelper({
        fileRelativePath: 'package.json',
        merge: () => '{"custom":"merged"}\n'
      });
      await writer.writeAsync(templateFs, '/target');

      expect(mockFileSystem.writeFileAsync).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(mockFileSystem.writeFileAsync.mock.calls[0]![1] as string);
      expect(writtenContent.custom).toBe('merged');
    });

    it('should not throw for built-in helper paths', async () => {
      const jsonContent = JSON.stringify({ name: 'test' });

      templateFs.write('package.json', jsonContent);
      templateFs.write('config/config.json', '{"bundles":{}}');
      templateFs.write('config/package-solution.json', '{"solution":{}}');
      templateFs.write('config/serve.json', '{"serveConfigurations":{}}');
      mockFileSystem.readFileAsync.mockResolvedValue(jsonContent);

      const writer = new SPFxTemplateWriter();
      // Should not throw — all files have registered merge helpers
      await writer.writeAsync(templateFs, '/target');
    });
  });
});
