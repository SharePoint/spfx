// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as os from 'node:os';

import { FileSystem, JsonFile } from '@rushstack/node-core-library';

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

  it.each([
    { selection: 'legacy omission', exposure: undefined },
    { selection: 'Connector only', exposure: ['Connector'] },
    { selection: 'Agent only', exposure: ['Agent'] },
    { selection: 'both', exposure: ['Connector', 'Agent'] },
    { selection: 'reversed both', exposure: ['Agent', 'Connector'] }
  ])(
    'should preserve $selection and authored Copilot assets through re-scaffolding and component-add',
    async ({ exposure }) => {
      const options = {
        templateName: 'copilot-component-minimal',
        targetDir: tempDir,
        localTemplatePath: TEMPLATES_DIR,
        libraryName: '@spfx-template/copilot-preservation-test',
        componentName: 'First'
      };
      await scaffoldAsync(options);

      const solutionPath = `${tempDir}/config/package-solution.json`;
      const manifestPath = `${tempDir}/copilot/manifest.json`;
      const agentConfigPath = `${tempDir}/config/copilot-agent.json`;
      const solution = await JsonFile.loadAsync(solutionPath);
      if (exposure) {
        solution.solution.copilotComponentExposure = exposure;
      } else {
        delete solution.solution.copilotComponentExposure;
      }
      await JsonFile.saveAsync(solution, solutionPath);

      const manifest = await JsonFile.loadAsync(manifestPath);
      manifest.agentConnectors[0].id = 'authoredConnector';
      manifest.agentSkills = [{ folder: 'skills/authored' }];
      await JsonFile.saveAsync(manifest, manifestPath);

      const agentConfig = await JsonFile.loadAsync(agentConfigPath);
      agentConfig.agents[0].toolDiscovery = 'static';
      await JsonFile.saveAsync(agentConfig, agentConfigPath);

      const skillPath = `${tempDir}/copilot/skills/authored/SKILL.md`;
      const supportPath = `${tempDir}/copilot/skills/authored/references/example.bin`;
      const skill = '# Authored skill\n\nKeep these instructions unchanged.\n';
      const support = Buffer.from([0, 1, 127, 128, 255]);
      await Promise.all([
        FileSystem.writeFileAsync(skillPath, skill, { ensureFolderExists: true }),
        FileSystem.writeFileAsync(supportPath, support, { ensureFolderExists: true })
      ]);
      const [authoredManifest, authoredConfig, authoredPlugin] = await Promise.all([
        FileSystem.readFileAsync(manifestPath),
        FileSystem.readFileAsync(agentConfigPath),
        FileSystem.readFileAsync(`${tempDir}/copilot/ai-plugin.json`)
      ]);

      for (const componentName of ['First', 'Second']) {
        await scaffoldAsync({ ...options, componentName });

        const result = await JsonFile.loadAsync(solutionPath);
        if (exposure) {
          expect(result.solution.copilotComponentExposure).toEqual(exposure);
        } else {
          expect(result.solution).not.toHaveProperty('copilotComponentExposure');
        }
        const [actualManifest, actualConfig, actualPlugin, actualSkill, actualSupport] = await Promise.all([
          FileSystem.readFileAsync(manifestPath),
          FileSystem.readFileAsync(agentConfigPath),
          FileSystem.readFileAsync(`${tempDir}/copilot/ai-plugin.json`),
          FileSystem.readFileAsync(skillPath),
          FileSystem.readFileToBufferAsync(supportPath)
        ]);
        expect(actualManifest).toBe(authoredManifest);
        expect(actualConfig).toBe(authoredConfig);
        expect(actualPlugin).toBe(authoredPlugin);
        expect(actualSkill).toBe(skill);
        expect(actualSupport).toEqual(support);
      }
      const config = await JsonFile.loadAsync(`${tempDir}/config/config.json`);
      expect(Object.keys(config.bundles)).toEqual(['first-copilot-component', 'second-copilot-component']);
      expect(await FileSystem.existsAsync(`${tempDir}/src/SecondCopilotComponent.ts`)).toBe(true);
    }
  );
});
