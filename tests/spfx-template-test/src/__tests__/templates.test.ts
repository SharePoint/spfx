import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import ignore from 'ignore';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// Path to the root of the monorepo
const REPO_ROOT = path.resolve(__dirname, '../../../../');
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
  localTemplatePath: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
}

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    libraryName: '@spfx-template/hello-world-test',
    templateName: 'test',
    templatePath: path.join(REPO_ROOT, 'tests/spfx-template-test/test-template'),
    localTemplatePath: path.join(REPO_ROOT, 'tests/spfx-template-test'),
    componentName: 'Hello World',
    componentAlias: 'HelloWorld',
    componentDescription: 'A hello world test component'
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
    libraryName: '@spfx-template/extension-formcustomizer-noframework',
    templateName: 'extension-formcustomizer-noframework',
    templatePath: path.join(REPO_ROOT, 'templates/extension-formcustomizer-noframework'),
    localTemplatePath: path.join(REPO_ROOT, 'templates'),
    componentName: 'NoFrameworkFormCustomizer',
    componentAlias: 'NoFrameworkFormCustomizer',
    componentDescription: 'NoFrameworkFormCustomizer Description'
  },
];

