// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('node:fs/promises');

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { MemFsEditor } from 'mem-fs-editor';

import { SPFxTemplateWriter } from '../SPFxTemplateWriter';

describe(SPFxTemplateWriter.name, () => {
  let mockEditor: MemFsEditor;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEditor = {
      write: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      dump: jest.fn().mockReturnValue({})
    } as unknown as MemFsEditor;
  });

  it('should commit new files without merge', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'src/newFile.ts': { contents: 'new content', state: 'modified' }
    });
    (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
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

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: incomingPkg, state: 'modified' }
    });
    (readFile as jest.Mock).mockResolvedValue(existingPkg);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(writtenContent.name).toBe('existing');
    expect(writtenContent.dependencies.lodash).toBe('^4.17.0');
    expect(writtenContent.dependencies.axios).toBe('^1.0.0');
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should preserve existing content when no merge helper exists and content differs', async () => {
    const existingContent = '{"old": true}';
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'some/unknown/file.json': { contents: '{"new": true}', state: 'modified' }
    });
    (readFile as jest.Mock).mockResolvedValue(existingContent);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    // Should write the existing content into the editor to prevent overwrite
    expect(mockEditor.write).toHaveBeenCalledWith(
      path.join('/target', 'some/unknown/file.json'),
      existingContent
    );
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should skip silently when content is same without merge helper', async () => {
    const sameContent = '{"key": "value"}';
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'some/unknown/file.json': { contents: sameContent, state: 'modified' }
    });
    (readFile as jest.Mock).mockResolvedValue(sameContent);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should skip deleted files', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: null, state: 'deleted' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    expect(readFile).not.toHaveBeenCalled();
    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
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

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'src/newComponent.ts': { contents: 'export class NewComponent {}', state: 'modified' },
      'config/config.json': { contents: incomingConfig, state: 'modified' }
    });

    (readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('config.json')) {
        return Promise.resolve(existingConfig);
      }
      return Promise.reject(new Error('ENOENT'));
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    // config.json should be merged
    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(writtenContent.bundles['old-bundle']).toBeDefined();
    expect(writtenContent.bundles['new-bundle']).toBeDefined();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should allow adding custom merge helpers', async () => {
    const existingContent = 'existing';
    const incomingContent = 'incoming';

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'custom/file.txt': { contents: incomingContent, state: 'modified' }
    });
    (readFile as jest.Mock).mockResolvedValue(existingContent);

    const writer = new SPFxTemplateWriter();
    writer.addMergeHelper({
      fileRelativePath: 'custom/file.txt',
      merge: (existing: string, incoming: string) => `${existing}+${incoming}`
    });
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).toHaveBeenCalledWith(
      path.join('/target', 'custom/file.txt'),
      'existing+incoming'
    );
  });

  it('should skip files with null contents', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: null, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  describe('error propagation', () => {
    it('should propagate error when editor.commit() rejects', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({});
      (mockEditor.commit as jest.Mock).mockRejectedValue(new Error('commit failed'));

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(mockEditor, '/target')).rejects.toThrow('commit failed');
    });

    it('should propagate error when a merge helper merge() throws', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: 'not valid json', state: 'modified' }
      });
      (readFile as jest.Mock).mockResolvedValue('{"name": "existing"}');

      const writer = new SPFxTemplateWriter();

      await expect(writer.writeAsync(mockEditor, '/target')).rejects.toThrow(SyntaxError);
    });
  });

  describe(`${SPFxTemplateWriter.prototype.addMergeHelper.name} behavior`, () => {
    it('should replace a built-in helper when registering for the same path', async () => {
      const existingPkg = JSON.stringify({ name: 'existing', dependencies: {} });
      const incomingPkg = JSON.stringify({ name: 'incoming', dependencies: {} });

      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: incomingPkg, state: 'modified' }
      });
      (readFile as jest.Mock).mockResolvedValue(existingPkg);

      const writer = new SPFxTemplateWriter();
      writer.addMergeHelper({
        fileRelativePath: 'package.json',
        merge: () => '{"custom":"merged"}\n'
      });
      await writer.writeAsync(mockEditor, '/target');

      expect(mockEditor.write).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
      expect(writtenContent.custom).toBe('merged');
    });

    it('should not throw for built-in helper paths', async () => {
      const jsonContent = JSON.stringify({ name: 'test' });

      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: jsonContent, state: 'modified' },
        'config/config.json': { contents: '{"bundles":{}}', state: 'modified' },
        'config/package-solution.json': { contents: '{"solution":{}}', state: 'modified' },
        'config/serve.json': { contents: '{"serveConfigurations":{}}', state: 'modified' }
      });
      (readFile as jest.Mock).mockResolvedValue(jsonContent);

      const writer = new SPFxTemplateWriter();
      await writer.writeAsync(mockEditor, '/target');

      // Should not throw — all files have registered merge helpers
      expect(mockEditor.commit).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty dump object without errors', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({});

      const writer = new SPFxTemplateWriter();
      await writer.writeAsync(mockEditor, '/target');

      expect(mockEditor.write).not.toHaveBeenCalled();
      expect(mockEditor.commit).toHaveBeenCalled();
    });

    it('should normalize backslash separators in dump keys for cross-platform support', async () => {
      const existingConfig = JSON.stringify({
        bundles: { 'old-bundle': {} },
        localizedResources: {},
        externals: {}
      });

      const incomingConfig = JSON.stringify({
        bundles: { 'new-bundle': {} },
        localizedResources: {},
        externals: {}
      });

      // Simulate Windows-style backslash paths from editor.dump()
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'config\\config.json': { contents: incomingConfig, state: 'modified' }
      });
      (readFile as jest.Mock).mockResolvedValue(existingConfig);

      const writer = new SPFxTemplateWriter();
      await writer.writeAsync(mockEditor, '/target');

      // Should still find the config.json merge helper despite backslash path
      expect(mockEditor.write).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
      expect(writtenContent.bundles['old-bundle']).toBeDefined();
      expect(writtenContent.bundles['new-bundle']).toBeDefined();
    });

    it('should treat entry with undefined state as non-deleted', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'src/file.ts': { contents: 'content', state: undefined }
      });
      (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const writer = new SPFxTemplateWriter();
      await writer.writeAsync(mockEditor, '/target');

      // File doesn't exist on disk, so no merge attempted — just commit
      expect(mockEditor.write).not.toHaveBeenCalled();
      expect(mockEditor.commit).toHaveBeenCalled();
    });
  });
});
