// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as os from 'node:os';

import { Executable } from '@rushstack/node-core-library';

import { REPO_ROOT, CLI_PATH, TEMPLATES_DIR } from './constants';

/**
 * Helper to run the scaffolding CLI for a given template into a target directory.
 */
function scaffold(options: {
  templateName: string;
  targetDir: string;
  libraryName: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
}): void {
  const args: string[] = [
    CLI_PATH,
    'create',
    '--template',
    options.templateName,
    '--target-dir',
    options.targetDir,
    '--local-template',
    TEMPLATES_DIR,
    '--library-name',
    options.libraryName,
    '--component-name',
    options.componentName
  ];

  if (options.componentAlias) {
    args.push('--component-alias', options.componentAlias);
  }

  if (options.componentDescription) {
    args.push('--component-description', options.componentDescription);
  }

  const result = Executable.spawnSync('node', args, {
    currentWorkingDirectory: REPO_ROOT,
    stdio: 'inherit',
    environment: { ...process.env, SPFX_CI_MODE: '1' }
  });

  if (result.status !== 0) {
    throw new Error(`Scaffold failed with exit code ${result.status}`);
  }
}

describe('Multi-component scaffolding', () => {
  jest.setTimeout(120000);

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(`${os.tmpdir()}/spfx-multi-`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should scaffold webpart-minimal then extension-application-customizer into same directory', () => {
    // Step 1: Scaffold webpart-minimal
    scaffold({
      templateName: 'webpart-minimal',
      targetDir: tempDir,
      libraryName: '@spfx-template/multi-component-test',
      componentName: 'Minimal',
      componentAlias: 'Minimal',
      componentDescription: 'Minimal Web Part Description'
    });

    // Step 2: Scaffold extension-application-customizer into SAME directory
    scaffold({
      templateName: 'extension-application-customizer',
      targetDir: tempDir,
      libraryName: '@spfx-template/multi-component-test',
      componentName: 'AppCustomizer',
      componentAlias: 'AppCustomizer',
      componentDescription: 'AppCustomizer Description'
    });

    // Step 3: Snapshot the 4 key merged config files
    const packageJson: string = fs.readFileSync(`${tempDir}/package.json`, 'utf-8');
    const configJson: string = fs.readFileSync(`${tempDir}/config/config.json`, 'utf-8');
    const packageSolutionJson: string = fs.readFileSync(`${tempDir}/config/package-solution.json`, 'utf-8');
    const serveJson: string = fs.readFileSync(`${tempDir}/config/serve.json`, 'utf-8');

    expect(JSON.parse(packageJson)).toMatchSnapshot('merged package.json');
    expect(JSON.parse(configJson)).toMatchSnapshot('merged config/config.json');
    expect(JSON.parse(packageSolutionJson)).toMatchSnapshot('merged config/package-solution.json');
    expect(JSON.parse(serveJson)).toMatchSnapshot('merged config/serve.json');

    // Step 4: Verify source file coexistence
    expect(fs.existsSync(`${tempDir}/src/webparts/minimalWebPart/MinimalWebPart.ts`)).toBe(true);
    expect(
      fs.existsSync(
        `${tempDir}/src/extensions/appCustomizerApplicationCustomizer/AppCustomizerApplicationCustomizer.ts`
      )
    ).toBe(true);
  });
});
