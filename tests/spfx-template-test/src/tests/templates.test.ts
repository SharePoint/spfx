// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';
import ignore from 'ignore';

import { _isBinaryFile as isBinaryFile } from '@microsoft/spfx-template-api';
import { Async, FileSystem, NewlineKind, Path } from '@rushstack/node-core-library';

import { PROJECT_ROOT, REPO_ROOT, TEMPLATES_DIR } from './constants';

import { scaffoldAsync } from './testUtilities';

const EXAMPLES_DIR: string = `${REPO_ROOT}/examples`;
const TEMP_OUTPUT_DIR: string = `${PROJECT_ROOT}/temp/examples`;

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

interface IGetAllFilesOptions {
  dir: string;
  baseDir?: string;
  ignoreMatcher: ReturnType<typeof ignore>;
}

/**
 * Recursively get all files in a directory
 */
async function* getAllFilesAsync(options: IGetAllFilesOptions): AsyncIterable<string> {
  const { dir, baseDir = dir, ignoreMatcher } = options;
  let entries;
  try {
    entries = await FileSystem.readFolderItemsAsync(dir);
  } catch (error) {
    if (!FileSystem.isNotExistError(error)) {
      throw error;
    }
  }

  if (entries) {
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      // Check if this path should be ignored
      if (!ignoreMatcher.ignores(relativePath)) {
        if (entry.isDirectory()) {
          yield* getAllFilesAsync({ dir: fullPath, baseDir, ignoreMatcher });
        } else {
          // Return relative path from baseDir
          yield path.relative(baseDir, fullPath);
        }
      }
    }
  }
}

/**
 * Read file content, return undefined if file doesn't exist or can't be read
 * Normalizes line endings to `\n` for consistent comparison
 */
async function readFileContentAsync(filePath: string): Promise<string | undefined> {
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
 * Clean up the temp output directory before scaffolding
 */
async function cleanTempOutputDirAsync(templateName: string): Promise<void> {
  const outputPath = `${TEMP_OUTPUT_DIR}/${templateName}`;
  await FileSystem.deleteFolderAsync(outputPath);
}

// Skip build artifacts and generated files
const IGNORED_FILES: Set<string> = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'webpack.config.js',
  '.spfx-scaffold.jsonl'
]);
const IGNORED_DIRS: string[] = ['.rush', 'rush-logs', 'temp', 'node_modules', 'dist', 'teams'];

// Filter out files that should be ignored in comparison/sync
async function filterFilesIterableAsync(iterable: AsyncIterable<string>): Promise<string[]> {
  const result: string[] = [];
  for await (const file of iterable) {
    const normalized: string = Path.convertToSlashes(file);

    // Ignore specific files regardless of their directory
    const filename: string = normalized.slice(normalized.lastIndexOf('/') + 1);
    if (IGNORED_FILES.has(filename)) {
      continue;
    }

    // Ignore any path that is or contains one of the ignored directories as a segment
    if (
      IGNORED_DIRS.some(
        (dir) =>
          normalized === dir || normalized.startsWith(dir + '/') || normalized.includes('/' + dir + '/')
      )
    ) {
      continue;
    }

    result.push(normalized);
  }

  return result;
}

describe('SPFx Template Scaffolding', () => {
  // Increase timeout for scaffolding operations
  jest.setTimeout(120000);

  beforeAll(async () => {
    await FileSystem.ensureFolderAsync(TEMP_OUTPUT_DIR);
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
        // Always scaffold to temp directory
        const outputPath: string = `${TEMP_OUTPUT_DIR}/${templateName}`;

        // Check if example exists (only in normal mode)
        const exampleExists = await FileSystem.existsAsync(examplePath);
        if (!UPDATE_MODE && !exampleExists) {
          throw new Error(`No example found for template '${templateName}' at ${examplePath}`);
        }

        // Clean up temp output directory
        await cleanTempOutputDirAsync(templateName);

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

        // Get all files from both directories for comparison
        const [scaffoldedFilesIterable, exampleFilesIterable] = await Promise.all([
          getAllFilesAsync({ dir: outputPath, ignoreMatcher }),
          getAllFilesAsync({ dir: examplePath, baseDir: examplePath, ignoreMatcher })
        ]);
        const [filteredScaffolded, filteredExample] = await Promise.all([
          filterFilesIterableAsync(scaffoldedFilesIterable),
          filterFilesIterableAsync(exampleFilesIterable)
        ]);
        filteredScaffolded.sort();
        filteredExample.sort();

        // If update mode, sync scaffolded output to the example directory
        if (UPDATE_MODE) {
          await FileSystem.ensureFolderAsync(examplePath);

          // Determine which files to delete from example (files that no longer exist in template)
          const scaffoldedSet: Set<string> = new Set(filteredScaffolded);
          await Promise.all([
            Async.forEachAsync(
              filteredExample,
              async (file) => {
                if (!scaffoldedSet.has(file)) {
                  await FileSystem.deleteFileAsync(`${examplePath}/${file}`);
                }
              },
              { concurrency: 5 }
            ),
            // Copy all scaffolded files to example directory
            Async.forEachAsync(
              filteredScaffolded,
              async (file) => {
                const content: Buffer = await FileSystem.readFileToBufferAsync(`${outputPath}/${file}`);
                await FileSystem.writeFileAsync(`${examplePath}/${file}`, content, {
                  ensureFolderExists: true
                });
              },
              { concurrency: 5 }
            )
          ]);

          console.info(`[UPDATE MODE] Synced ${templateName} to ${examplePath}`);
        } else {
          // Check that the same files exist in both directories
          expect(filteredScaffolded).toEqual(filteredExample);

          // Compare content of each file with detailed diffs
          await Async.forEachAsync(
            filteredScaffolded,
            async (file) => {
              const scaffoldedFile: string = `${outputPath}/${file}`;
              const exampleFile: string = `${examplePath}/${file}`;

              if (isBinaryFile(file)) {
                // Compare binary files as raw buffers
                try {
                  const [scaffoldedBuffer, exampleBuffer] = await Promise.all([
                    FileSystem.readFileToBufferAsync(scaffoldedFile),
                    FileSystem.readFileToBufferAsync(exampleFile)
                  ]);
                  expect(scaffoldedBuffer).toEqual(exampleBuffer);
                } catch (error) {
                  throw new Error(`Binary file mismatch in '${file}':\n${error}`);
                }
              } else {
                // Compare text files as normalized strings
                const [scaffoldedContent, exampleContent] = await Promise.all([
                  readFileContentAsync(scaffoldedFile),
                  readFileContentAsync(exampleFile)
                ]);

                // Use Jest's expect to get nice diff output
                // Add file context to the error message
                try {
                  expect(scaffoldedContent).toEqual(exampleContent);
                } catch (error) {
                  throw new Error(`File content mismatch in '${file}':\n${error}`);
                }
              }
            },
            { concurrency: 10 }
          );
        }
      }
    );
  });
});
