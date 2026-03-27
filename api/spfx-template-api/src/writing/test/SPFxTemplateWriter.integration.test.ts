// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { MemFsEditor } from 'mem-fs-editor';

import { SPFxTemplateWriter } from '../SPFxTemplateWriter';

/**
 * Integration tests for SPFxTemplateWriter using real file I/O.
 *
 * These tests create real temp directories and write real JSON files to disk,
 * then verify that the writer correctly reads existing files and merges them
 * with incoming content. The MemFsEditor is still mocked (dump/write/commit),
 * but the writer uses real async file reads via node:fs/promises.
 */
describe(`${SPFxTemplateWriter.name} integration`, () => {
  let tempDir: string;
  let mockEditor: MemFsEditor;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spfx-writer-'));

    mockEditor = {
      write: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      dump: jest.fn().mockReturnValue({})
    } as unknown as MemFsEditor;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should merge real package.json on disk', async () => {
    const existingPkg = {
      name: 'my-solution',
      version: '1.0.0',
      dependencies: { lodash: '^4.17.0', react: '^17.0.0' },
      devDependencies: { typescript: '^5.0.0' }
    };

    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(existingPkg, null, 2));

    const incomingPkg = JSON.stringify({
      name: 'template',
      dependencies: { lodash: '^4.18.0', axios: '^1.0.0' },
      devDependencies: { jest: '^29.0.0' }
    });

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: incomingPkg, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const merged = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(merged.name).toBe('my-solution');
    expect(merged.dependencies.lodash).toBe('^4.17.0');
    expect(merged.dependencies.react).toBe('^17.0.0');
    expect(merged.dependencies.axios).toBe('^1.0.0');
    expect(merged.devDependencies.typescript).toBe('^5.0.0');
    expect(merged.devDependencies.jest).toBe('^29.0.0');
  });

  it('should merge real config/config.json on disk', async () => {
    const configDir = path.join(tempDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const existingConfig = {
      $schema: 'https://schema.example.com',
      version: '2.0',
      bundles: { 'webpart-bundle': { components: [{ entrypoint: './lib/webpart.js' }] } },
      localizedResources: { WebPartStrings: 'lib/loc/{locale}.js' },
      externals: {}
    };

    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(existingConfig, null, 2));

    const incomingConfig = JSON.stringify({
      bundles: { 'extension-bundle': { components: [{ entrypoint: './lib/extension.js' }] } },
      localizedResources: { ExtensionStrings: 'lib/loc/{locale}.js' },
      externals: {}
    });

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'config/config.json': { contents: incomingConfig, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const merged = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(merged.bundles['webpart-bundle']).toBeDefined();
    expect(merged.bundles['extension-bundle']).toBeDefined();
    expect(merged.localizedResources.WebPartStrings).toBeDefined();
    expect(merged.localizedResources.ExtensionStrings).toBeDefined();
  });

  it('should merge real config/package-solution.json on disk', async () => {
    const configDir = path.join(tempDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const existingPkgSolution = {
      $schema: 'https://schema.example.com',
      solution: {
        name: 'my-solution',
        id: 'sol-1',
        version: '1.0.0.0',
        features: [{ id: 'feat-1', title: 'WebPart Feature', version: '1.0.0.0' }]
      },
      paths: { zippedPackage: 'solution/my-solution.sppkg' }
    };

    fs.writeFileSync(
      path.join(configDir, 'package-solution.json'),
      JSON.stringify(existingPkgSolution, null, 2)
    );

    const incomingPkgSolution = JSON.stringify({
      solution: {
        features: [{ id: 'feat-2', title: 'Extension Feature', version: '1.0.0.0' }]
      }
    });

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'config/package-solution.json': { contents: incomingPkgSolution, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const merged = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    expect(merged.solution.name).toBe('my-solution');
    expect(merged.solution.features).toHaveLength(2);
    expect(merged.solution.features[0].id).toBe('feat-1');
    expect(merged.solution.features[1].id).toBe('feat-2');
    expect(merged.paths.zippedPackage).toBe('solution/my-solution.sppkg');
  });

  it('should merge real config/serve.json on disk', async () => {
    const configDir = path.join(tempDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const existingServe = {
      $schema: 'https://schema.example.com',
      port: 4321,
      https: true,
      initialPage: 'https://localhost/workbench',
      serveConfigurations: {
        webpart: { pageUrl: 'https://localhost/webpart' }
      }
    };

    fs.writeFileSync(path.join(configDir, 'serve.json'), JSON.stringify(existingServe, null, 2));

    const incomingServe = JSON.stringify({
      port: 9999,
      serveConfigurations: {
        extension: { pageUrl: 'https://localhost/extension' }
      }
    });

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'config/serve.json': { contents: incomingServe, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).toHaveBeenCalledTimes(1);
    const merged = JSON.parse((mockEditor.write as jest.Mock).mock.calls[0][1]);
    // Incoming wins for scalar fields
    expect(merged.port).toBe(9999);
    expect(merged.https).toBe(true);
    expect(merged.serveConfigurations.webpart).toBeDefined();
    expect(merged.serveConfigurations.extension).toBeDefined();
  });

  it('should skip merge when file does not exist on disk', async () => {
    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': { contents: '{"name":"new"}', state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should merge multiple config files in single writeAsync call', async () => {
    const configDir = path.join(tempDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'existing', dependencies: { react: '^17.0.0' } })
    );
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ bundles: { 'old-bundle': {} }, localizedResources: {}, externals: {} })
    );
    fs.writeFileSync(
      path.join(configDir, 'serve.json'),
      JSON.stringify({ port: 4321, serveConfigurations: { old: {} } })
    );

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'package.json': {
        contents: JSON.stringify({ dependencies: { axios: '^1.0.0' } }),
        state: 'modified'
      },
      'config/config.json': {
        contents: JSON.stringify({ bundles: { 'new-bundle': {} }, localizedResources: {}, externals: {} }),
        state: 'modified'
      },
      'config/serve.json': {
        contents: JSON.stringify({ serveConfigurations: { new: {} } }),
        state: 'modified'
      }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).toHaveBeenCalledTimes(3);
    expect(mockEditor.commit).toHaveBeenCalled();

    // Verify each merge was correct — use type assertions since we already
    // confirmed write was called 3 times above
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: any[][] = (mockEditor.write as jest.Mock).mock.calls;

    const pkgCall = calls.find((c) => String(c[0]).includes('package.json'));
    const mergedPkg = JSON.parse(String(pkgCall?.[1]));
    expect(mergedPkg.dependencies.react).toBe('^17.0.0');
    expect(mergedPkg.dependencies.axios).toBe('^1.0.0');

    const configCall = calls.find((c) => String(c[0]).includes('config.json'));
    const mergedConfig = JSON.parse(String(configCall?.[1]));
    expect(mergedConfig.bundles['old-bundle']).toBeDefined();
    expect(mergedConfig.bundles['new-bundle']).toBeDefined();

    const serveCall = calls.find((c) => String(c[0]).includes('serve.json'));
    const mergedServe = JSON.parse(String(serveCall?.[1]));
    expect(mergedServe.serveConfigurations.old).toBeDefined();
    expect(mergedServe.serveConfigurations.new).toBeDefined();
  });

  it('should preserve existing content for unregistered file with different content on disk', async () => {
    const existingContent = '{"existing": true}';
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), existingContent);

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'tsconfig.json': { contents: '{"compilerOptions":{}}', state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    // Should write existing content into the editor to prevent overwrite
    expect(mockEditor.write).toHaveBeenCalledWith(expect.stringContaining('tsconfig.json'), existingContent);
    expect(mockEditor.commit).toHaveBeenCalled();
  });

  it('should skip silently for unregistered file with same content on disk', async () => {
    const sameContent = '{"compilerOptions":{}}';
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), sameContent);

    (mockEditor.dump as jest.Mock).mockReturnValue({
      'tsconfig.json': { contents: sameContent, state: 'modified' }
    });

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(mockEditor, tempDir);

    expect(mockEditor.write).not.toHaveBeenCalled();
    expect(mockEditor.commit).toHaveBeenCalled();
  });
});
