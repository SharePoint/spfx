// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileSystem } from '@rushstack/node-core-library';

import { TemplateOutput } from '../TemplateOutput';
import { SPFxTemplateWriter } from '../SPFxTemplateWriter';

/**
 * Integration tests for SPFxTemplateWriter using real file I/O.
 *
 * These tests create real temp directories and write real JSON files to disk,
 * then verify that the writer correctly reads existing files, merges them
 * with incoming content, and writes the result.
 */
describe(`${SPFxTemplateWriter.name} integration`, () => {
  let tempDir: string;
  let templateFs: TemplateOutput;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spfx-writer-'));
    templateFs = new TemplateOutput();
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

    await FileSystem.writeFileAsync(`${tempDir}/package.json`, JSON.stringify(existingPkg, null, 2));

    const incomingPkg = JSON.stringify({
      name: 'template',
      dependencies: { lodash: '^4.18.0', axios: '^1.0.0' },
      devDependencies: { jest: '^29.0.0' }
    });

    templateFs.write('package.json', incomingPkg);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const merged = JSON.parse(await FileSystem.readFileAsync(`${tempDir}/package.json`));
    expect(merged.name).toBe('my-solution');
    expect(merged.dependencies.lodash).toBe('^4.17.0');
    expect(merged.dependencies.react).toBe('^17.0.0');
    expect(merged.dependencies.axios).toBe('^1.0.0');
    expect(merged.devDependencies.typescript).toBe('^5.0.0');
    expect(merged.devDependencies.jest).toBe('^29.0.0');
  });

  it('should merge real config/config.json on disk', async () => {
    const configDir = `${tempDir}/config`;
    await FileSystem.ensureFolderAsync(configDir);

    const existingConfig = {
      $schema: 'https://schema.example.com',
      version: '2.0',
      bundles: { 'webpart-bundle': { components: [{ entrypoint: './lib/webpart.js' }] } },
      localizedResources: { WebPartStrings: 'lib/loc/{locale}.js' },
      externals: {}
    };

    await FileSystem.writeFileAsync(`${configDir}/config.json`, JSON.stringify(existingConfig, null, 2));

    const incomingConfig = JSON.stringify({
      bundles: { 'extension-bundle': { components: [{ entrypoint: './lib/extension.js' }] } },
      localizedResources: { ExtensionStrings: 'lib/loc/{locale}.js' },
      externals: {}
    });

    templateFs.write('config/config.json', incomingConfig);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const merged = JSON.parse(await FileSystem.readFileAsync(`${configDir}/config.json`));
    expect(merged.bundles['webpart-bundle']).toBeDefined();
    expect(merged.bundles['extension-bundle']).toBeDefined();
    expect(merged.localizedResources.WebPartStrings).toBeDefined();
    expect(merged.localizedResources.ExtensionStrings).toBeDefined();
  });

  it('should merge real config/package-solution.json on disk', async () => {
    const configDir = `${tempDir}/config`;
    await FileSystem.ensureFolderAsync(configDir);

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

    await FileSystem.writeFileAsync(
      `${configDir}/package-solution.json`,
      JSON.stringify(existingPkgSolution, null, 2)
    );

    const incomingPkgSolution = JSON.stringify({
      solution: {
        features: [{ id: 'feat-2', title: 'Extension Feature', version: '1.0.0.0' }]
      }
    });

    templateFs.write('config/package-solution.json', incomingPkgSolution);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const merged = JSON.parse(await FileSystem.readFileAsync(`${configDir}/package-solution.json`));
    expect(merged.solution.name).toBe('my-solution');
    expect(merged.solution.features).toHaveLength(2);
    expect(merged.solution.features[0].id).toBe('feat-1');
    expect(merged.solution.features[1].id).toBe('feat-2');
    expect(merged.paths.zippedPackage).toBe('solution/my-solution.sppkg');
  });

  it('should merge real config/serve.json on disk', async () => {
    const configDir = `${tempDir}/config`;
    await FileSystem.ensureFolderAsync(configDir);

    const existingServe = {
      $schema: 'https://schema.example.com',
      port: 4321,
      https: true,
      initialPage: 'https://localhost/workbench',
      serveConfigurations: {
        webpart: { pageUrl: 'https://localhost/webpart' }
      }
    };

    await FileSystem.writeFileAsync(`${configDir}/serve.json`, JSON.stringify(existingServe, null, 2));

    const incomingServe = JSON.stringify({
      port: 9999,
      serveConfigurations: {
        extension: { pageUrl: 'https://localhost/extension' }
      }
    });

    templateFs.write('config/serve.json', incomingServe);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const merged = JSON.parse(await FileSystem.readFileAsync(`${configDir}/serve.json`));
    // Incoming wins for scalar fields
    expect(merged.port).toBe(9999);
    expect(merged.https).toBe(true);
    expect(merged.serveConfigurations.webpart).toBeDefined();
    expect(merged.serveConfigurations.extension).toBeDefined();
  });

  it('should write new files when they do not exist on disk', async () => {
    templateFs.write('package.json', '{"name":"new"}');

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const written = await FileSystem.readFileAsync(`${tempDir}/package.json`);
    expect(written).toBe('{"name":"new"}');
  });

  it('should merge multiple config files in single writeAsync call', async () => {
    const configDir = `${tempDir}/config`;
    await FileSystem.ensureFolderAsync(configDir);

    await FileSystem.writeFileAsync(
      `${tempDir}/package.json`,
      JSON.stringify({ name: 'existing', dependencies: { react: '^17.0.0' } })
    );
    await FileSystem.writeFileAsync(
      `${configDir}/config.json`,
      JSON.stringify({ bundles: { 'old-bundle': {} }, localizedResources: {}, externals: {} })
    );
    await FileSystem.writeFileAsync(
      `${configDir}/serve.json`,
      JSON.stringify({ port: 4321, serveConfigurations: { old: {} } })
    );

    templateFs.write('package.json', JSON.stringify({ dependencies: { axios: '^1.0.0' } }));
    templateFs.write(
      'config/config.json',
      JSON.stringify({ bundles: { 'new-bundle': {} }, localizedResources: {}, externals: {} })
    );
    templateFs.write('config/serve.json', JSON.stringify({ serveConfigurations: { new: {} } }));

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const mergedPkg = JSON.parse(await FileSystem.readFileAsync(`${tempDir}/package.json`));
    expect(mergedPkg.dependencies.react).toBe('^17.0.0');
    expect(mergedPkg.dependencies.axios).toBe('^1.0.0');

    const mergedConfig = JSON.parse(await FileSystem.readFileAsync(`${configDir}/config.json`));
    expect(mergedConfig.bundles['old-bundle']).toBeDefined();
    expect(mergedConfig.bundles['new-bundle']).toBeDefined();

    const mergedServe = JSON.parse(await FileSystem.readFileAsync(`${configDir}/serve.json`));
    expect(mergedServe.serveConfigurations.old).toBeDefined();
    expect(mergedServe.serveConfigurations.new).toBeDefined();
  });

  it('should preserve existing content for unregistered file with different content on disk', async () => {
    const existingContent = '{"existing": true}';
    await FileSystem.writeFileAsync(`${tempDir}/tsconfig.json`, existingContent);

    templateFs.write('tsconfig.json', '{"compilerOptions":{}}');

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    // Existing content should be preserved — writer skips unregistered files with different content
    const actual = await FileSystem.readFileAsync(`${tempDir}/tsconfig.json`);
    expect(actual).toBe(existingContent);
  });

  it('should skip silently for unregistered file with same content on disk', async () => {
    const sameContent = '{"compilerOptions":{}}';
    await FileSystem.writeFileAsync(`${tempDir}/tsconfig.json`, sameContent);

    templateFs.write('tsconfig.json', sameContent);

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const actual = await FileSystem.readFileAsync(`${tempDir}/tsconfig.json`);
    expect(actual).toBe(sameContent);
  });

  it('should create intermediate directories for new files', async () => {
    templateFs.write('src/webparts/myWebPart/MyWebPart.ts', 'export class MyWebPart {}');

    const writer = new SPFxTemplateWriter();
    await writer.writeAsync(templateFs, tempDir);

    const actual = await FileSystem.readFileAsync(`${tempDir}/src/webparts/myWebPart/MyWebPart.ts`);
    expect(actual).toBe('export class MyWebPart {}');
  });
});
