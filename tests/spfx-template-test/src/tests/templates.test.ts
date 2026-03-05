// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { promisify } from 'node:util';
import ignore from 'ignore';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// Path to the root of the monorepo
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const OUTPUT_DIR = path.join(REPO_ROOT, 'common/temp/examples');
const CLI_PATH = path.join(REPO_ROOT, 'apps/spfx-cli/bin/spfx');

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
    templatePath: path.join(REPO_ROOT, 'tests/spfx-template-test/test-template'),
    localTemplatePath: path.join(REPO_ROOT, 'tests/spfx-template-test'),
    componentName: 'Hello World',
    componentAlias: 'HelloWorld',
    componentDescription: 'A hello world test component',
    solutionName: 'test-solution-name'
  },
  {
    libraryName: '@spfx-template/library',
    templateName: 'library',
    templatePath: path.join(REPO_ROOT, 'templates/library'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Example',
    componentAlias: 'ExampleLibrary',
    componentDescription: 'Library Description'
  },
  {
    libraryName: '@spfx-template/webpart-minimal',
    templateName: 'webpart-minimal',
    templatePath: path.join(REPO_ROOT, 'templates/webpart-minimal'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Web Part Description'
  },
  {
    libraryName: '@spfx-template/webpart-noframework',
    templateName: 'webpart-noframework',
    templatePath: path.join(REPO_ROOT, 'templates/webpart-noframework'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'No Framework Web Part Description'
  },
  {
    libraryName: '@spfx-template/ace-data-visualization',
    templateName: 'ace-data-visualization',
    templatePath: path.join(REPO_ROOT, 'templates/ace-data-visualization'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'DataVisualization',
    componentAlias: 'DataVisualizationCard',
    componentDescription: 'DataVisualizationCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-card',
    templateName: 'ace-generic-card',
    templatePath: path.join(REPO_ROOT, 'templates/ace-generic-card'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'GenericCard',
    componentAlias: 'GenericCard',
    componentDescription: 'GenericCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-image-card',
    templateName: 'ace-generic-image-card',
    templatePath: path.join(REPO_ROOT, 'templates/ace-generic-image-card'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'GenericImage',
    componentAlias: 'GenericImageCard',
    componentDescription: 'GenericImageCard Description'
  },
  {
    libraryName: '@spfx-template/ace-generic-primarytext-card',
    templateName: 'ace-generic-primarytext-card',
    templatePath: path.join(REPO_ROOT, 'templates/ace-generic-primarytext-card'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'GenericPrimaryText',
    componentAlias: 'GenericPrimaryTextCard',
    componentDescription: 'GenericPrimaryTextCard Description'
  },
  {
    libraryName: '@spfx-template/ace-search-card',
    templateName: 'ace-search-card',
    templatePath: path.join(REPO_ROOT, 'templates/ace-search-card'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'SearchCard',
    componentDescription: 'SearchCard Description'
  },
  {
    libraryName: '@spfx-template/extension-application-customizer',
    templateName: 'extension-application-customizer',
    templatePath: path.join(REPO_ROOT, 'templates/extension-application-customizer'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'ApplicationCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-minimal',
    templateName: 'extension-fieldcustomizer-minimal',
    templatePath: path.join(REPO_ROOT, 'templates/extension-fieldcustomizer-minimal'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-noframework',
    templateName: 'extension-fieldcustomizer-noframework',
    templatePath: path.join(REPO_ROOT, 'templates/extension-fieldcustomizer-noframework'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'NoFramework Description'
  },
  {
    libraryName: '@spfx-template/extension-fieldcustomizer-react',
    templateName: 'extension-fieldcustomizer-react',
    templatePath: path.join(REPO_ROOT, 'templates/extension-fieldcustomizer-react'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'ReactFieldCustomizer',
    componentAlias: 'ReactFieldCustomizerFieldCustomizer',
    componentDescription: 'ReactFieldCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-formcustomizer-noframework',
    templateName: 'extension-formcustomizer-noframework',
    templatePath: path.join(REPO_ROOT, 'templates/extension-formcustomizer-noframework'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'NoFramework',
    componentAlias: 'NoFramework',
    componentDescription: 'NoFramework Description'
  },
  {
    libraryName: '@spfx-template/extension-formcustomizer-react',
    templateName: 'extension-formcustomizer-react',
    templatePath: path.join(REPO_ROOT, 'templates/extension-formcustomizer-react'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'ReactFormCustomizer',
    componentAlias: 'ReactFormCustomizerFormCustomizer',
    componentDescription: 'ReactFormCustomizer Description'
  },
  {
    libraryName: '@spfx-template/extension-listviewcommandset',
    templateName: 'extension-listviewcommandset',
    templatePath: path.join(REPO_ROOT, 'templates/extension-listviewcommandset'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/extension-search-query-modifier',
    templateName: 'extension-search-query-modifier',
    templatePath: path.join(REPO_ROOT, 'templates/extension-search-query-modifier'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Description'
  },
  {
    libraryName: '@spfx-template/webpart-react',
    templateName: 'webpart-react',
    templatePath: path.join(REPO_ROOT, 'templates/webpart-react'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'Minimal',
    componentAlias: 'Minimal',
    componentDescription: 'Minimal Web Part Description'
  }
];

// Check for --update or -u flag
const UPDATE_MODE = process.argv.includes('--update') || process.argv.includes('-u');

/**
 * Parse .gitignore file and return ignore matcher
 */
async function parseGitignore(templateDir: string): Promise<ReturnType<typeof ignore>> {
  const gitignorePath = path.join(templateDir, '.gitignore');
  const ig = ignore();

  // Add default ignores that should always be excluded
  ig.add(['node_modules', 'lib', 'lib-commonjs', 'rush-logs', 'temp', 'dist', '.rush']);

  try {
    const gitignoreContent = await readFile(gitignorePath, 'utf-8');
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
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
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
 * Read file content, return undefined if file doesn't exist or can't be read.
 * Normalizes line endings to `\n` for consistent comparison.
 */
async function readFileContent(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    // Normalize line endings to \n
    return content.replace(/\r\n/g, '\n');
  } catch {
    return undefined;
  }
}

/**
 * Clean up the output directory before scaffolding
 */
function cleanOutputDir(templateName: string): void {
  const outputPath = path.join(OUTPUT_DIR, templateName);
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }
}

describe('SPFx Template Scaffolding', () => {
  // Increase timeout for scaffolding operations
  jest.setTimeout(120000);

  beforeAll(async () => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  // Create a test for each template configuration
  describe('Template scaffolding and comparison', () => {
    TEMPLATE_CONFIGS.forEach((config) => {
      it(`should scaffold ${config.templateName} template and match example output`, async () => {
        const examplePath = path.join(EXAMPLES_DIR, config.templateName);
        // In update mode, scaffold directly to examples directory
        // In normal mode, scaffold to temp directory for comparison
        const outputPath = UPDATE_MODE ? examplePath : path.join(OUTPUT_DIR, config.templateName);

        // Check if example exists (only in normal mode)
        if (!UPDATE_MODE && !fs.existsSync(examplePath)) {
          console.info(`Warning: No example found for template '${config.templateName}' at ${examplePath}`);
          return;
        }

        // Clean up output directory
        cleanOutputDir(config.templateName);

        // Ensure output directory exists
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }

        // Run the scaffolding CLI with library name and fixed component ID
        try {
          const commandParts = [
            `node "${CLI_PATH}" create`,
            `--template ${config.templateName}`,
            `--target-dir "${outputPath}"`,
            `--local-template "${config.localTemplatePath}"`,
            `--library-name "${config.libraryName}"`,
            `--component-name "${config.componentName}"`
          ];

          if (config.componentAlias) {
            commandParts.push(`--component-alias "${config.componentAlias}"`);
          }

          if (config.componentDescription) {
            commandParts.push(`--component-description "${config.componentDescription}"`);
          }

          if (config.solutionName) {
            commandParts.push(`--solution-name "${config.solutionName}"`);
          }

          const command = commandParts.join(' ');
          console.info(`Running: ${command}`);

          execSync(command, {
            stdio: 'inherit',
            cwd: REPO_ROOT,
            env: { ...process.env, SPFX_CI_MODE: '1' }
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to scaffold template '${config.templateName}': ${message}`);
        }

        // Parse .gitignore from template
        const ignoreMatcher = await parseGitignore(config.templatePath);

        // If update mode, skip comparison (we scaffolded directly to examples)
        if (UPDATE_MODE) {
          console.info(`[UPDATE MODE] Scaffolded ${config.templateName} to ${examplePath}`);
          return;
        }

        // Get all files from both directories
        const scaffoldedFiles = await getAllFiles(outputPath, outputPath, ignoreMatcher);
        const exampleFiles = await getAllFiles(examplePath, examplePath, ignoreMatcher);

        // Filter out files that should be ignored in comparison
        const filterFiles = (files: string[]): string[] =>
          files.filter((file) => {
            const normalized = file.replace(/\\/g, '/');
            // Skip binary/image files that cannot be meaningfully compared as UTF-8 text
            const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.woff', '.eot', '.ttf', '.ico'];
            if (ignoredExtensions.some((ext) => normalized.endsWith(ext))) {
              return false;
            }

            // Skip build artifacts and generated files
            const ignoredFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'webpack.config.js'];
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
          const scaffoldedFile = path.join(outputPath, file);
          const exampleFile = path.join(examplePath, file);

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
      });
    });
  });
});
