// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('node:fs');
jest.mock('@rushstack/terminal');

import * as fs from 'node:fs';
import type { MemFsEditor } from 'mem-fs-editor';
import { Terminal } from '@rushstack/terminal';

import { SPFxTemplateWriter } from '../SPFxTemplateWriter';

describe('SPFxTemplateWriter', () => {
  let mockTerminal: Terminal;
  let mockEditor: MemFsEditor;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTerminal = {
      writeWarningLine: jest.fn(),
      writeLine: jest.fn(),
      writeErrorLine: jest.fn()
    } as unknown as Terminal;

    (Terminal as jest.MockedClass<typeof Terminal>).mockImplementation(() => mockTerminal);

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
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const writer = new SPFxTemplateWriter(mockTerminal);
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
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(existingPkg);

    const writer = new SPFxTemplateWriter(mockTerminal);
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(writtenContent.name).toBe('existing');
    expect(writtenContent.dependencies.lodash).toBe('^4.17.0');
    expect(writtenContent.dependencies.axios).toBe('^1.0.0');
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should warn and overwrite when no merge helper exists', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'some/unknown/file.json': { contents: '{}', state: 'modified' }
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const writer = new SPFxTemplateWriter(mockTerminal);
    await writer.writeAsync(mockEditor, '/target');

    expect(mockTerminal.writeWarningLine).toHaveBeenCalledWith(
      expect.stringContaining('some/unknown/file.json')
    );
    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should skip deleted files', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: null, state: 'deleted' }
    });

    const writer = new SPFxTemplateWriter(mockTerminal);
    await writer.writeAsync(mockEditor, '/target');

    expect(fs.existsSync).not.toHaveBeenCalled();
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

    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.includes('config.json');
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(existingConfig);

    const writer = new SPFxTemplateWriter(mockTerminal);
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
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(existingContent);

    const writer = new SPFxTemplateWriter(mockTerminal);
    writer.addMergeHelper({
      fileRelativePath: 'custom/file.txt',
      merge: (existing: string, incoming: string) => `${existing}+${incoming}`
    });
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).toHaveBeenCalledWith(
      expect.stringContaining('custom/file.txt'),
      'existing+incoming'
    );
  });

  it('should skip files with null contents', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: null, state: 'modified' }
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const writer = new SPFxTemplateWriter(mockTerminal);
    await writer.writeAsync(mockEditor, '/target');

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  describe('error propagation', () => {
    it('should propagate error when editor.commit() rejects', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({});
      (mockEditor.commit as jest.Mock).mockRejectedValue(new Error('commit failed'));

      const writer = new SPFxTemplateWriter(mockTerminal);

      await expect(writer.writeAsync(mockEditor, '/target')).rejects.toThrow('commit failed');
    });

    it('should propagate error when fs.readFileSync throws', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: '{}', state: 'modified' }
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: file not found');
      });

      const writer = new SPFxTemplateWriter(mockTerminal);

      await expect(writer.writeAsync(mockEditor, '/target')).rejects.toThrow('ENOENT');
    });

    it('should propagate error when a merge helper merge() throws', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: 'not valid json', state: 'modified' }
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('{"name": "existing"}');

      const writer = new SPFxTemplateWriter(mockTerminal);

      await expect(writer.writeAsync(mockEditor, '/target')).rejects.toThrow(SyntaxError);
    });
  });

  describe('addMergeHelper behavior', () => {
    it('should replace a built-in helper when registering for the same path', async () => {
      const existingPkg = JSON.stringify({ name: 'existing', dependencies: {} });
      const incomingPkg = JSON.stringify({ name: 'incoming', dependencies: {} });

      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: incomingPkg, state: 'modified' }
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(existingPkg);

      const writer = new SPFxTemplateWriter(mockTerminal);
      writer.addMergeHelper({
        fileRelativePath: 'package.json',
        merge: () => '{"custom":"merged"}\n'
      });
      await writer.writeAsync(mockEditor, '/target');

      expect(mockEditor.write).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
      expect(writtenContent.custom).toBe('merged');
    });

    it('should not warn for built-in helper paths', async () => {
      const jsonContent = JSON.stringify({ name: 'test' });

      (mockEditor.dump as jest.Mock).mockReturnValue({
        'package.json': { contents: jsonContent, state: 'modified' },
        'config/config.json': { contents: '{"bundles":{}}', state: 'modified' },
        'config/package-solution.json': { contents: '{"solution":{}}', state: 'modified' },
        'config/serve.json': { contents: '{"serveConfigurations":{}}', state: 'modified' }
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(jsonContent);

      const writer = new SPFxTemplateWriter(mockTerminal);
      await writer.writeAsync(mockEditor, '/target');

      expect(mockTerminal.writeWarningLine).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty dump object without errors', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({});

      const writer = new SPFxTemplateWriter(mockTerminal);
      await writer.writeAsync(mockEditor, '/target');

      expect(mockEditor.write).not.toHaveBeenCalled();
      expect(mockEditor.commit).toHaveBeenCalled();
    });

    it('should treat entry with undefined state as non-deleted', async () => {
      (mockEditor.dump as jest.Mock).mockReturnValue({
        'src/file.ts': { contents: 'content', state: undefined }
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const writer = new SPFxTemplateWriter(mockTerminal);
      await writer.writeAsync(mockEditor, '/target');

      // File doesn't exist on disk, so no merge attempted — just commit
      expect(mockEditor.write).not.toHaveBeenCalled();
      expect(mockEditor.commit).toHaveBeenCalled();
    });
  });
});
