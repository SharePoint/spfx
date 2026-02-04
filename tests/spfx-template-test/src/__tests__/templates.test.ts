import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import ignore from 'ignore';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// Path to the root of the monorepo
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const TEST_TEMPLATE_DIR = path.join(REPO_ROOT, 'tests/spfx-template-test'); // Directory passed to --local-template; contains the test-template subdirectory
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const OUTPUT_DIR = path.join(REPO_ROOT, 'common/temp/examples');
const CLI_PATH = path.join(REPO_ROOT, 'apps/spfx-cli/bin/spfx');

// Fixed GUID for testing
const FIXED_SOLUTION_ID = '44d64337-e2f4-48e2-a954-a68795124bf2';
const FIXED_COMPONENT_ID = '413af0cb-0c9f-43db-8f86-ad1accc90481';
const FIXED_FEATURE_ID = '31c122c7-8373-4d00-89e7-e5f412958ca4';

// Predefined template configuration
interface TemplateConfig {
  libraryName: string;
  templateName: string;
  templatePath: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
}

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    libraryName: '@spfx-template/hello-world-test',
    templateName: 'test',
    templatePath: path.join(REPO_ROOT, 'tests/spfx-template-test/test-template'),
    componentName: 'Hello World',
    componentAlias: 'HelloWorld',
    componentDescription: 'A hello world test component'
  },
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
  ig.add([
    'node_modules',
    'lib',
    'lib-commonjs',
    'rush-logs',
    'temp',
    'dist',
    '.rush'
  ]);
  
  try {
    const gitignoreContent = await readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  } catch (error) {
    // If .gitignore doesn't exist, just use default ignores
    console.warn(`No .gitignore found at ${gitignorePath}, using default ignores`);
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
 * Read file content, return null if file doesn't exist or can't be read
 * Normalizes line endings to \n for consistent comparison
 */
async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    // Normalize line endings to \n
    return content.replace(/\r\n/g, '\n');
  } catch (error) {
    return null;
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
          console.warn(`Warning: No example found for template '${config.templateName}' at ${examplePath}`);
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
            `--local-template "${TEST_TEMPLATE_DIR}"`,
            `--library-name "${config.libraryName}"`,
            `--component-id "${FIXED_COMPONENT_ID}"`,
            `--solution-id "${FIXED_SOLUTION_ID}"`,
            `--feature-id "${FIXED_FEATURE_ID}"`,
            `--component-name "${config.componentName}"`
          ];

          if (config.componentAlias) {
            commandParts.push(`--component-alias "${config.componentAlias}"`);
          }

          if (config.componentDescription) {
            commandParts.push(`--component-description "${config.componentDescription}"`);
          }

          const command = commandParts.join(' ');
          console.log(`Running: ${command}`);
          
          execSync(command, {
            stdio: 'inherit',
            cwd: REPO_ROOT,
            env: { ...process.env }
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to scaffold template '${config.templateName}': ${message}`);
        }

        // Parse .gitignore from template
        const ignoreMatcher = await parseGitignore(config.templatePath);

        // If update mode, skip comparison (we scaffolded directly to examples)
        if (UPDATE_MODE) {
          console.log(`[UPDATE MODE] Scaffolded ${config.templateName} to ${examplePath}`);
          return;
        }

        // Get all files from both directories
        const scaffoldedFiles = await getAllFiles(outputPath, outputPath, ignoreMatcher);
        const exampleFiles = await getAllFiles(examplePath, examplePath, ignoreMatcher);

        // Filter out files that should be ignored in comparison
        const filterFiles = (files: string[]) => 
          files.filter((file) => {
            const normalized = file.replace(/\\/g, '/');
            // Skip build artifacts and generated files
            const ignoredFiles = [
              'package-lock.json',
              'yarn.lock',
              'pnpm-lock.yaml',
              'webpack.config.js'
            ];
            const ignoredDirs = [
              '.rush',
              'rush-logs',
              'temp',
              'node_modules',
              'dist',
              'teams'
            ];

            // Ignore specific files regardless of their directory
            if (ignoredFiles.some(name => normalized === name || normalized.endsWith('/' + name))) {
              return false;
            }

            // Ignore any path that is or contains one of the ignored directories as a segment
            if (ignoredDirs.some(dir =>
              normalized === dir ||
              normalized.startsWith(dir + '/') ||
              normalized.includes('/' + dir + '/')
            )) {
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
