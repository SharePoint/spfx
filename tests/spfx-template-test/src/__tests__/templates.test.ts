import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import ignore from 'ignore';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Path to the root of the monorepo
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const TEST_TEMPLATE_DIR = path.join(REPO_ROOT, 'tests/spfx-template-test'); // Parent directory containing test-template subdirectory
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
}

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    libraryName: '@spfx-template/hello-world-test',
    templateName: 'test-template',
    templatePath: path.join(REPO_ROOT, 'tests/spfx-template-test/test-template')
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

/**
 * Copy directory recursively from source to destination
 * Only updates files that are different
 * Returns the number of files updated
 */
function copyDirectory(src: string, dest: string, ignoreMatcher?: ReturnType<typeof ignore>): number {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let updatedCount = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(src, srcPath).replace(/\\/g, '/');

    // Skip if should be ignored
    if (ignoreMatcher && ignoreMatcher.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      updatedCount += copyDirectory(srcPath, destPath, ignoreMatcher);
    } else {
      // Compare files before copying
      let shouldCopy = false;
      
      if (!fs.existsSync(destPath)) {
        shouldCopy = true;
      } else {
        // Compare content (normalize line endings)
        const srcContent = fs.readFileSync(srcPath, 'utf-8').replace(/\r\n/g, '\n');
        const destContent = fs.readFileSync(destPath, 'utf-8').replace(/\r\n/g, '\n');
        shouldCopy = srcContent !== destContent;
      }
      
      if (shouldCopy) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  Updated: ${relativePath}`);
        updatedCount++;
      }
    }
  }
  
  return updatedCount;
}

/**
 * Get all template names from the templates directory
 */
async function getTemplateNames(): Promise<string[]> {
  const entries = await readdir(TEST_TEMPLATE_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'test')
    .map((entry) => entry.name);
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
          const command = [
            `node "${CLI_PATH}" create`,
            `--template ${config.templateName}`,
            `--target-dir "${outputPath}"`,
            `--local-template "${TEST_TEMPLATE_DIR}"`,
            `--library-name "${config.libraryName}"`,
            `--component-id "${FIXED_COMPONENT_ID}"`,
            `--solution-id "${FIXED_SOLUTION_ID}"`,
            `--feature-id "${FIXED_FEATURE_ID}"`
          ].join(' ');
          console.log(`Running: ${command}`);
          
          execSync(command, {
            stdio: 'inherit',
            cwd: REPO_ROOT,
            env: { ...process.env }
          });
        } catch (error) {
          throw new Error(`Failed to scaffold template '${config.templateName}': ${error.message}`);
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
            return !normalized.match(/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.rush\/|rush-logs\/|temp\/|node_modules\/|dist\/|teams\/|webpack\.config\.js)$/);
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
          } catch (error) {
            throw new Error(`File content mismatch in '${file}':\n${error.message}`);
          }
        }
      });
    });
  });
});
