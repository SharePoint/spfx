// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as os from 'node:os';

import { FileSystem } from '@rushstack/node-core-library';

import { scaffoldAsync } from './testUtilities';
import { TEMPLATES_DIR } from './constants';

describe('Multi-component scaffolding', () => {
  jest.setTimeout(120000);

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(`${os.tmpdir()}/spfx-multi-`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should scaffold webpart-minimal then extension-application-customizer into same directory', async () => {
    // Step 1: Scaffold webpart-minimal
    await scaffoldAsync({
      templateName: 'webpart-minimal',
      targetDir: tempDir,
      localTemplatePath: TEMPLATES_DIR,
      libraryName: '@spfx-template/multi-component-test',
      componentName: 'Minimal',
      componentAlias: 'Minimal',
      componentDescription: 'Minimal Web Part Description'
    });

    // Step 2: Scaffold extension-application-customizer into SAME directory
    await scaffoldAsync({
      templateName: 'extension-application-customizer',
      targetDir: tempDir,
      localTemplatePath: TEMPLATES_DIR,
      libraryName: '@spfx-template/multi-component-test',
      componentName: 'AppCustomizer',
      componentAlias: 'AppCustomizer',
      componentDescription: 'AppCustomizer Description'
    });

    // Step 3: Snapshot the 4 key merged config files
    const [packageJson, configJson, packageSolutionJson, serveJson] = await Promise.all([
      FileSystem.readFileAsync(`${tempDir}/package.json`),
      FileSystem.readFileAsync(`${tempDir}/config/config.json`),
      FileSystem.readFileAsync(`${tempDir}/config/package-solution.json`),
      FileSystem.readFileAsync(`${tempDir}/config/serve.json`)
    ]);

    expect(JSON.parse(packageJson)).toMatchSnapshot('merged package.json');
    expect(JSON.parse(configJson)).toMatchSnapshot('merged config/config.json');
    expect(JSON.parse(packageSolutionJson)).toMatchSnapshot('merged config/package-solution.json');
    expect(JSON.parse(serveJson)).toMatchSnapshot('merged config/serve.json');

    // Step 4: Verify source file coexistence
    const [minimalWebPartExists, appCustomizerApplicationCustomizerExists] = await Promise.all([
      FileSystem.existsAsync(`${tempDir}/src/webparts/minimalWebPart/MinimalWebPart.ts`),
      FileSystem.existsAsync(
        `${tempDir}/src/extensions/appCustomizerApplicationCustomizer/AppCustomizerApplicationCustomizer.ts`
      )
    ]);
    expect(minimalWebPartExists).toBe(true);
    expect(appCustomizerApplicationCustomizerExists).toBe(true);
  });
});
