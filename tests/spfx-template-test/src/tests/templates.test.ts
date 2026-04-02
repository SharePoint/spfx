// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';
import ignore from 'ignore';

import { _isBinaryFile as isBinaryFile } from '@microsoft/spfx-template-api';
import { FileSystem, NewlineKind } from '@rushstack/node-core-library';

import { REPO_ROOT, TEMPLATES_DIR } from './constants';

import { scaffoldAsync } from './testUtilities';

const EXAMPLES_DIR: string = `${REPO_ROOT}/examples`;
const OUTPUT_DIR: string = `${REPO_ROOT}/common/temp/examples`;

// Predefined template configuration
interface ITemplateConfig {
  libraryName: string;
  templateName: string;
  templatePath: string;
  localTemplatePath: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
  solutionName?: string;
}

const TEMPLATE_CONFIGS: ITemplateConfig[] = [
  {
    libraryName: '@spfx-template/hello-world-test',
    templateName: 'test',
    templatePath: `${REPO_ROOT}/tests/spfx-template-test/test-template`,
    localTemplatePath: `${REPO_ROOT}/tests/spfx-template-test`,
    componentName: 'Hello World',
    componentAlias: 'HelloWorld',
    componentDescription: 'A hello world test component',
    solutionName: 'test-solution-name'
  },
  {
    libraryName: '@spfx-template/library',
    templateName: 'library',
    templatePath: `${REPO_ROOT}/templates/library`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Example',
    componentAlias: 'ExampleLibrary',
    componentDescription: 'Library Description'
  },
  {
    libraryName: '@spfx-template/webpart-minimal',
    templateName: 'webpart-minimal',
    templatePath: `${REPO_ROOT}/templates/webpart-minimal`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Web Part Description'
  },
  {
    libraryName: '@spfx-template/webpart-noframework',
    templateName: 'webpart-noframework',
    templatePath: `${REPO_ROOT}/templates/webpart-noframework`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'No Framework Web Part Description'
  },
  {
    libraryName: '@spfx-template/ace-data-visualization',
    templateName: 'ace-data-visualization',
    templatePath: `${REPO_ROOT}/templates/ace-data-visualization`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'DataVisualization',
    componentAlias: 'DataVisualizationCard',
    componentDescription: 'DataVisualizationCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-card',
    templateName: 'ace-generic-card',
    templatePath: `${REPO_ROOT}/templates/ace-generic-card`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'GenericCard',
    componentAlias: 'GenericCard',
    componentDescription: 'GenericCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-image-card',
    templateName: 'ace-generic-image-card',
    templatePath: `${REPO_ROOT}/templates/ace-generic-image-card`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'GenericImage',
    componentAlias: 'GenericImageCard',
    componentDescription: 'GenericImageCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-primarytext-card',
    templateName: 'ace-generic-primarytext-card',
    templatePath: `${REPO_ROOT}/templates/ace-generic-primarytext-card`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'GenericPrimaryText',
    componentAlias: 'GenericPrimaryTextCard',
    componentDescription: 'GenericPrimaryTextCard Description'
  },
  {
    libraryName: '@spfx-template/ace-search-card',
    templateName: 'ace-search-card',
    templatePath: `${REPO_ROOT}/templates/ace-search-card`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'SearchCard',
    componentDescription: 'SearchCard Description'
  },
  {
    libraryName: '@spfx-template/extension-application-customizer',
    templateName: 'extension-application-customizer',
    templatePath: `${REPO_ROOT}/templates/extension-application-customizer`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'ApplicationCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-minimal',
    templateName: 'extension-fieldcustomizer-minimal',
    templatePath: `${REPO_ROOT}/templates/extension-fieldcustomizer-minimal`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-noframework',
    templateName: 'extension-fieldcustomizer-noframework',
    templatePath: `${REPO_ROOT}/templates/extension-fieldcustomizer-noframework`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'NoFramework Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-react',
    templateName: 'extension-fieldcustomizer-react',
    templatePath: `${REPO_ROOT}/templates/extension-fieldcustomizer-react`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'ReactFieldCustomizer',
    componentAlias: 'ReactFieldCustomizerFieldCustomizer',
    componentDescription: 'ReactFieldCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-formcustomizer-noframework',
    templateName: 'extension-formcustomizer-noframework',
    templatePath: `${REPO_ROOT}/templates/extension-formcustomizer-noframework`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'NoFramework Description'
  },
  {
    libraryName: '@spfx-template/extension-formcustomizer-react',
    templateName: 'extension-formcustomizer-react',
    templatePath: `${REPO_ROOT}/templates/extension-formcustomizer-react`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'ReactFormCustomizer',
    componentAlias: 'ReactFormCustomizerFormCustomizer',
    componentDescription: 'ReactFormCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-listviewcommandset',
    templateName: 'extension-listviewcommandset',
    templatePath: `${REPO_ROOT}/templates/extension-listviewcommandset`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/extension-search-query-modifier',
    templateName: 'extension-search-query-modifier',
    templatePath: `${REPO_ROOT}/templates/extension-search-query-modifier`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/webpart-react',
    templateName: 'webpart-react',
    templatePath: `${REPO_ROOT}/templates/webpart-react`,
    localTemplatePath: TEMPLATES_DIR,
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Web Part Description'
  }
];

// Check for --update or -u flag
// eslint-disable-next-line dot-notation
const UPDATE_MODE = expect.getState()['snapshotState']._updateSnapshot === 'all';

/**
 * Parse .gitignore file and return ignore matcher
 */
async function parseGitignore(templateDir: string): Promise<ReturnType<typeof ignore>> {
  const gitignorePath = `${templateDir}/.gitignore`;
  const ig = ignore();

  // Add default ignores that should always be excluded
  ig.add(['node_modules', 'lib', 'lib-commonjs', 'rush-logs', 'temp', 'dist', '.rush']);

  try {
    const gitignoreContent = await FileSystem.readFileAsync(gitignorePath);
    ig.add(gitignoreContent);
  } catch {
    // If .gitignore doesn't exist, just use default ignores
    console.info(`No .gitignore found at ${gitignorePath}, using default ignores`);
  }

  return ig;
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(
  dir: string,
  baseDir: string = dir,
  ignoreMatcher?: ReturnType<typeof ignore>
): Promise<string[]> {
  const entries = await FileSystem.readFolderItemsAsync(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = `${dir}/${entry.name}`;
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      // Check if this path should be ignored
      if (ignoreMatcher && ignoreMatcher.ignores(relativePath)) {
        return [];
      }

      if (entry.isDirectory()) {
        return getAllFiles(fullPath, baseDir, ignoreMatcher);
      } else {
        // Return relative path from baseDir
        return [path.relative(baseDir, fullPath)];
      }
    })
  );
  return files.flat();
}

/**
 * Read file content, return undefined if file doesn't exist or can't be read
 * Normalizes line endings to `\n` for consistent comparison
 */
async function readFileContent(filePath: string): Promise<string | undefined> {
  try {
    return await FileSystem.readFileAsync(filePath, { convertLineEndings: NewlineKind.Lf });
  } catch (error) {
    if (FileSystem.isNotExistError(error)) {
      return undefined;
    } else {
      throw error;
    }
  }
}

/**
 * Clean up the output directory before scaffolding
 */
async function cleanOutputDirAsync(templateName: string): Promise<void> {
  const outputPath = `${OUTPUT_DIR}/${templateName}`;
  await FileSystem.deleteFolderAsync(outputPath);
}

describe('SPFx Template Scaffolding', () => {
  // Increase timeout for scaffolding operations
  jest.setTimeout(120000);

  beforeAll(async () => {
    await FileSystem.ensureFolderAsync(OUTPUT_DIR);
  });

  // Create a test for each template configuration
  describe('Template scaffolding and comparison', () => {
    it.each(TEMPLATE_CONFIGS)(
      'should scaffold $templateName template and match example output',
      async (config) => {
        const {
          templateName,
          libraryName,
          componentName,
          componentAlias,
          componentDescription,
          solutionName,
          templatePath,
          localTemplatePath
        } = config;

        const examplePath = `${EXAMPLES_DIR}/${templateName}`;
        // In update mode, scaffold directly to examples directory
        // In normal mode, scaffold to temp directory for comparison
        const outputPath = UPDATE_MODE ? examplePath : `${OUTPUT_DIR}/${templateName}`;

        // Check if example exists (only in normal mode)
        const exampleExists = await FileSystem.existsAsync(examplePath);
        if (!UPDATE_MODE && !exampleExists) {
          throw new Error(`No example found for template '${templateName}' at ${examplePath}`);
        }

        // Clean up output directory
        await cleanOutputDirAsync(templateName);

        // Ensure output directory exists
        await FileSystem.ensureFolderAsync(outputPath);

        // Run the scaffolding CLI with library name and fixed component ID
        try {
          await scaffoldAsync({
            templateName,
            targetDir: outputPath,
            localTemplatePath,
            libraryName,
            componentName,
            componentAlias,
            componentDescription,
            solutionName
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to scaffold template '${templateName}': ${message}`);
        }

        // Parse .gitignore from template
        const ignoreMatcher = await parseGitignore(templatePath);

        // If update mode, skip comparison (we scaffolded directly to examples)
        if (UPDATE_MODE) {
          console.info(`[UPDATE MODE] Scaffolded ${templateName} to ${examplePath}`);
          return;
        }

        // Get all files from both directories
        const scaffoldedFiles = await getAllFiles(outputPath, outputPath, ignoreMatcher);
        const exampleFiles = await getAllFiles(examplePath, examplePath, ignoreMatcher);

        // Filter out files that should be ignored in comparison
        const filterFiles = (files: string[]): string[] =>
          files.filter((file) => {
            const normalized = file.replace(/\\/g, '/');
            // Skip build artifacts and generated files
            const ignoredFiles = [
              'package-lock.json',
              'yarn.lock',
              'pnpm-lock.yaml',
              'webpack.config.js',
              '.spfx-scaffold.jsonl'
            ];
            const ignoredDirs = ['.rush', 'rush-logs', 'temp', 'node_modules', 'dist', 'teams'];

            // Ignore specific files regardless of their directory
            if (ignoredFiles.some((name) => normalized === name || normalized.endsWith('/' + name))) {
              return false;
            }

            // Ignore any path that is or contains one of the ignored directories as a segment
            if (
              ignoredDirs.some(
                (dir) =>
                  normalized === dir ||
                  normalized.startsWith(dir + '/') ||
                  normalized.includes('/' + dir + '/')
              )
            ) {
              return false;
            }

            return true;
          });

        const filteredScaffolded = filterFiles(scaffoldedFiles).sort();
        const filteredExample = filterFiles(exampleFiles).sort();

        // Check that the same files exist in both directories
        expect(filteredScaffolded).toEqual(filteredExample);

        // Compare content of each file with detailed diffs
        for (const file of filteredScaffolded) {
          const scaffoldedFile = `${outputPath}/${file}`;
          const exampleFile = `${examplePath}/${file}`;

          if (isBinaryFile(file)) {
            // Compare binary files as raw buffers
            try {
              const scaffoldedBuffer = await FileSystem.readFileAsync(scaffoldedFile);
              const exampleBuffer = await FileSystem.readFileAsync(exampleFile);
              expect(scaffoldedBuffer).toEqual(exampleBuffer);
            } catch (error: unknown) {
              if (error instanceof Error) {
                throw new Error(`Binary file mismatch in '${file}':\n${error.message}`);
              }
              throw new Error(`Binary file mismatch in '${file}':\n${String(error)}`);
            }
          } else {
            // Compare text files as normalized strings
            const scaffoldedContent = await readFileContent(scaffoldedFile);
            const exampleContent = await readFileContent(exampleFile);

            // Use Jest's expect to get nice diff output
            // Add file context to the error message
            try {
              expect(scaffoldedContent).toEqual(exampleContent);
            } catch (error: unknown) {
              if (error instanceof Error) {
                throw new Error(`File content mismatch in '${file}':\n${error.message}`);
              }
              throw new Error(`File content mismatch in '${file}':\n${String(error)}`);
            }
          }
        }
      }
    );
  });
});
