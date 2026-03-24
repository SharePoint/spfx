// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

type PackageManager = 'npm' | 'pnpm' | 'yarn';

import { camelCase, kebabCase, snakeCase, upperFirst } from 'lodash';
import type { MemFsEditor } from 'mem-fs-editor';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import * as z from 'zod';

import { Executable } from '@rushstack/node-core-library';
import { Colorize, type Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  type CommandLineStringListParameter,
  type CommandLineStringParameter,
  type IRequiredCommandLineChoiceParameter,
  type IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';
import {
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  type SPFxTemplateCollection,
  SPFxTemplateRepositoryManager,
  type SPFxTemplate,
  SPFxTemplateWriter
} from '@microsoft/spfx-template-api';

import { SOLUTION_NAME_PATTERN } from '../../utilities/validation';

const DEFAULT_GITHUB_REPO: string = 'https://github.com/SharePoint/spfx';
export const SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME: string = 'SPFX_TEMPLATE_REPO_URL';

// Deterministic namespace for CI mode GUIDs, derived from the well-known URL
// namespace: uuidv5('spfx-cli:ci', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
const CI_NAMESPACE: string = '035a23a9-8c9e-569b-ae00-7ff2e4c82fb0';
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';

interface IScaffoldProfile {
  localTemplateSources?: Array<string> | readonly string[];
  templateName: string;
  targetDir: string;
}

const ScaffoldProfileSchema: z.ZodType<IScaffoldProfile> = z.object({
  targetDir: z.string().min(1),
  localTemplateSources: z.array(z.string()).optional().default([]),
  templateName: z.string().min(1)
});

export class CreateAction extends CommandLineAction {
  private readonly _terminal: Terminal;

  private readonly _targetDirParameter: IRequiredCommandLineStringParameter;
  private readonly _templateParameter: IRequiredCommandLineStringParameter;
  private readonly _localTemplateSourcesParameter: CommandLineStringListParameter;
  private readonly _libraryNameParameter: IRequiredCommandLineStringParameter;
  private readonly _componentNameParameter: IRequiredCommandLineStringParameter;
  private readonly _componentAliasParameter: CommandLineStringParameter;
  private readonly _componentDescriptionParameter: CommandLineStringParameter;
  private readonly _solutionNameParameter: CommandLineStringParameter;
  private readonly _templateUrlParameter: CommandLineStringParameter;
  private readonly _spfxVersionParameter: CommandLineStringParameter;
  private readonly _packageManagerParameter: IRequiredCommandLineChoiceParameter<PackageManager | 'none'>;

  public constructor(terminal: Terminal) {
    super({
      actionName: 'create',
      summary: 'Scaffolds an SPFx component into the current folder',
      documentation: 'This command creates a new SPFx component.'
    });

    this._terminal = terminal;

    this._targetDirParameter = this.defineStringParameter({
      parameterLongName: '--target-dir',
      argumentName: 'TARGET_DIR',
      description: 'The directory to create the solution (or where the solution already exists)',
      defaultValue: process.cwd()
    });

    this._localTemplateSourcesParameter = this.defineStringListParameter({
      parameterLongName: '--local-template',
      argumentName: 'TEMPLATE_PATH',
      description: 'Path to a local template folder'
    });

    this._templateParameter = this.defineStringParameter({
      parameterLongName: '--template',
      argumentName: 'TEMPLATE_NAME',
      description: 'The template to use for scaffolding',
      required: true
    });

    this._libraryNameParameter = this.defineStringParameter({
      parameterLongName: '--library-name',
      argumentName: 'LIBRARY_NAME',
      description: 'The library name for the component',
      required: true
    });

    this._componentNameParameter = this.defineStringParameter({
      parameterLongName: '--component-name',
      argumentName: 'COMPONENT_NAME',
      description: 'The component name (e.g., "Hello World")',
      required: true
    });

    this._componentAliasParameter = this.defineStringParameter({
      parameterLongName: '--component-alias',
      argumentName: 'COMPONENT_ALIAS',
      description: 'The component alias. If not provided, will use the component name.'
    });

    this._componentDescriptionParameter = this.defineStringParameter({
      parameterLongName: '--component-description',
      argumentName: 'COMPONENT_DESCRIPTION',
      description: 'The component description. If not provided, will generate from component name.'
    });

    this._solutionNameParameter = this.defineStringParameter({
      parameterLongName: '--solution-name',
      argumentName: 'SOLUTION_NAME',
      description: 'The solution name. If not provided, defaults to the kebab-case component name.'
    });

    this._templateUrlParameter = this.defineStringParameter({
      parameterLongName: '--template-url',
      argumentName: 'URL',
      description: `URL of the GitHub template repository. Defaults to ${DEFAULT_GITHUB_REPO}.`,
      environmentVariable: SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME
    });

    this._spfxVersionParameter = this.defineStringParameter({
      parameterLongName: '--spfx-version',
      argumentName: 'VERSION',
      description:
        'The SPFx version to use (e.g., "1.22", "1.23-rc.0"). Resolves to the "version/<VERSION>" branch ' +
        "in the template repository. Defaults to the repository's default branch (main)."
    });

    this._packageManagerParameter = this.defineChoiceParameter({
      parameterLongName: '--package-manager',
      description:
        'Package manager to use for dependency installation after scaffolding. ' +
        'Use "none" to skip installation.',
      alternatives: ['npm', 'pnpm', 'yarn', 'none'],
      defaultValue: 'none'
    });
  }

  protected async onExecuteAsync(): Promise<void> {
    const terminal: Terminal = this._terminal;

    try {
      const options: IScaffoldProfile = {
        localTemplateSources: this._localTemplateSourcesParameter.values,
        templateName: this._templateParameter.value,
        targetDir: this._targetDirParameter.value
      };

      const validationResult: z.ZodSafeParseResult<IScaffoldProfile> =
        ScaffoldProfileSchema.safeParse(options);
      if (!validationResult.success) {
        throw new Error(`Invalid scaffold profile: ${JSON.stringify(validationResult.error.issues)}`);
      }
      const { templateName, targetDir } = options;

      const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

      if (this._localTemplateSourcesParameter.values.length > 0) {
        if (this._spfxVersionParameter.value !== undefined) {
          terminal.writeWarningLine(
            `${this._spfxVersionParameter.longName} is ignored when ${this._localTemplateSourcesParameter.longName} is specified.`
          );
        }
        for (const localPath of this._localTemplateSourcesParameter.values) {
          terminal.writeLine(`Adding local template source: ${localPath}`);
          manager.addSource(new LocalFileSystemRepositorySource(localPath));
        }
      } else {
        const rawUrl: string = (this._templateUrlParameter.value ?? '').trim() || DEFAULT_GITHUB_REPO;
        const { repoUrl, urlBranch } = parseGitHubUrlAndRef(rawUrl);

        const spfxVersionRaw: string | undefined = this._spfxVersionParameter.value?.trim();
        let spfxVersionBranch: string | undefined;
        if (spfxVersionRaw) {
          if (spfxVersionRaw.startsWith('version/')) {
            spfxVersionBranch = spfxVersionRaw;
          } else {
            spfxVersionBranch = `version/${spfxVersionRaw}`;
          }
        }

        if (spfxVersionBranch && urlBranch) {
          terminal.writeWarningLine(
            `${this._templateUrlParameter.longName} contains a branch ('/tree/${urlBranch}'). ` +
              `${this._spfxVersionParameter.longName} "${spfxVersionRaw}" will take precedence.`
          );
        }

        const ref: string | undefined = spfxVersionBranch ?? urlBranch;

        terminal.writeLine(`Using GitHub template source: ${repoUrl}${ref ? ` (branch: ${ref})` : ''}`);
        manager.addSource(new PublicGitHubRepositorySource(repoUrl, ref, this._terminal));
      }

      let templates: SPFxTemplateCollection;
      try {
        templates = await manager.getTemplatesAsync();
      } catch (fetchError: unknown) {
        const fetchMessage: string = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(
          `Failed to fetch templates. If you are offline or behind a firewall, ` +
            `use ${this._localTemplateSourcesParameter.longName} to specify a local template source. Details: ${fetchMessage}`,
          { cause: fetchError }
        );
      }

      terminal.writeLine(templates.toString());

      const template: SPFxTemplate | undefined = templates.get(templateName);

      if (!template) {
        throw new Error(
          `Template not found: ${templateName}. Available: ${Array.from(templates.keys()).join(', ')}`
        );
      }

      // Get component name and validate
      const componentName: string = this._componentNameParameter.value;
      if (!componentName || componentName.trim().length === 0) {
        throw new Error('Component name is required and cannot be empty or only whitespace.');
      }

      const componentAlias: string = this._componentAliasParameter.value || componentName;

      // CI mode is read from an environment variable instead of a ts-command-line
      // parameter so it stays out of --help output. It is an internal/undocumented
      // flag used only by CI pipelines and tests to produce deterministic output.
      // eslint-disable-next-line dot-notation
      const ciMode: boolean = process.env['SPFX_CI_MODE'] === '1';
      const componentId: string = ciMode ? uuidv5(`component:${componentAlias}`, CI_NAMESPACE) : uuidv4();
      const solutionId: string = ciMode ? CI_SOLUTION_ID : uuidv4();
      const featureId: string = ciMode ? uuidv5(`feature:${componentAlias}`, CI_NAMESPACE) : uuidv4();
      const componentDescription: string =
        this._componentDescriptionParameter.value || `${componentName} description`;

      // Compute name variants using lodash
      const componentNameCamelCase: string = camelCase(componentName);
      const componentNameHyphenCase: string = kebabCase(componentName);
      const componentNameCapitalCase: string = upperFirst(camelCase(componentName));
      const componentNameAllCaps: string = snakeCase(componentName).toUpperCase();

      const rawSolutionName: string | undefined = this._solutionNameParameter.value?.trim();
      if (rawSolutionName !== undefined && !SOLUTION_NAME_PATTERN.test(rawSolutionName)) {
        throw new Error(
          `Invalid solution name: "${rawSolutionName}". Must contain only alphanumeric characters, hyphens, and underscores.`
        );
      }
      const solutionName: string = rawSolutionName || componentNameHyphenCase;

      const fs: MemFsEditor = await template.renderAsync(
        {
          solution_name: solutionName,
          libraryName: this._libraryNameParameter.value,
          spfxVersion: template.spfxVersion,
          // The shields.io badge URL uses dashes as separators, so dashes in version numbers
          // need to be escaped as double dashes to avoid ambiguity. For example, "1.23.0-beta.0" becomes "1.23.0--beta.0".
          spfxVersionForBadgeUrl: template.spfxVersion.replace(/-/g, '--'),
          componentId: componentId,
          featureId: featureId,
          solutionId: solutionId,
          componentAlias: componentAlias,
          componentNameUnescaped: componentName,
          componentNameCamelCase: componentNameCamelCase,
          componentNameHyphenCase: componentNameHyphenCase,
          componentNameCapitalCase: componentNameCapitalCase,
          componentNameAllCaps: componentNameAllCaps,
          componentDescription: componentDescription
        },
        targetDir,
        { retainPhaseScripts: ciMode }
      );

      _printFileChanges(this._terminal, fs, targetDir);
      const writer: SPFxTemplateWriter = new SPFxTemplateWriter();
      await writer.writeAsync(fs, targetDir);

      const packageManager: PackageManager | 'none' = this._packageManagerParameter.value;
      if (packageManager !== 'none') {
        await _runInstallAsync(packageManager, targetDir, terminal);
      }
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      terminal.writeErrorLine(`Error creating SPFx component: ${message}`);
      throw error;
    }
  }
}

/**
 * Spawns the chosen package manager's install command in targetDir and waits for it to finish.
 * Files are already written before this is called, so a failure here does not undo scaffolding.
 */
async function _runInstallAsync(
  packageManager: PackageManager,
  targetDir: string,
  terminal: Terminal
): Promise<void> {
  terminal.writeLine(`Running ${packageManager} install in ${targetDir}...`);

  const child: ChildProcess = Executable.spawn(packageManager, ['install'], {
    currentWorkingDirectory: targetDir,
    stdio: 'inherit'
  });

  const { exitCode, signal } = await Executable.waitForExitAsync(child, {
    throwOnNonZeroExitCode: false,
    throwOnSignal: false
  });

  if (signal != null) {
    throw new Error(`${packageManager} install was terminated by signal ${signal}`);
  } else if (exitCode !== 0) {
    throw new Error(`${packageManager} install exited with code ${exitCode}`);
  }

  terminal.writeLine(`${packageManager} install completed successfully.`);
}

/**
 * Parses a GitHub (or GHE) URL that may contain a `/tree/<ref>` path segment.
 * Returns the clean repository URL (without `.git` or trailing slashes) and the optional branch ref.
 */
function parseGitHubUrlAndRef(rawUrl: string): { repoUrl: string; urlBranch: string | undefined } {
  const normalized: string = rawUrl.trim().replace(/\/+$/, '');
  // Match https://<host>/owner/repo[.git]/tree/<ref> — host-agnostic to support GHE.
  // Only the first path segment after /tree/ is captured as the ref; subdirectory
  // suffixes (e.g. /tree/main/some/subdir) are ignored.
  const treeMatch: RegExpMatchArray | null = normalized.match(
    /^(?<repo>https?:\/\/[^/]+\/[^/]+\/[^/]+?)(?:\.git)?\/tree\/(?<ref>[^/]+)/
  );
  if (treeMatch?.groups) {
    const { repo, ref } = treeMatch.groups as { repo: string; ref: string };
    return { repoUrl: repo, urlBranch: ref };
  }
  return { repoUrl: normalized.replace(/\.git$/, ''), urlBranch: undefined };
}

/**
 * Utility function to show the user which files in the in-memory file system are pending changes.
 */
function _printFileChanges(terminal: Terminal, fs: MemFsEditor, targetDir: string): void {
  terminal.writeLine(`targetDir: ${targetDir}`);
  interface IChangedFile {
    state: 'modified' | 'deleted';
    isNew: boolean;
  }
  const changed: { [key: string]: IChangedFile } = fs.dump(targetDir);

  terminal.writeLine();
  terminal.writeLine(Colorize.cyan('The following files will be modified:'));

  const changedEntries: [string, IChangedFile][] = Object.entries(changed).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );

  for (const [file, data] of changedEntries) {
    const { state, isNew } = data;
    if (isNew) {
      terminal.writeLine(Colorize.green(`Added: ${file}`));
      continue;
    }

    switch (state) {
      case 'modified':
        terminal.writeLine(Colorize.yellow(`Modified: ${file}`));
        break;
      case 'deleted':
        terminal.writeLine(Colorize.red(`Deleted: ${file}`));
        break;
      default:
        terminal.writeLine(`Unchanged: ${file}`);
        break;
    }
  }
  terminal.writeLine();
}
