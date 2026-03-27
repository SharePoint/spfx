// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

type PackageManager = 'npm' | 'pnpm' | 'yarn';

import { kebabCase } from 'lodash';
import type { MemFsEditor } from 'mem-fs-editor';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import * as z from 'zod';

import { Executable } from '@rushstack/node-core-library';
import { Colorize, type Terminal } from '@rushstack/terminal';
import type {
  CommandLineStringParameter,
  IRequiredCommandLineChoiceParameter,
  IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';
import {
  type SPFxTemplateCollection,
  SPFxTemplateRepositoryManager,
  type SPFxTemplate,
  SPFxTemplateWriter,
  SPFxScaffoldLog
} from '@microsoft/spfx-template-api';

import { SOLUTION_NAME_PATTERN } from '../../utilities/validation';
import { SPFxActionBase } from './SPFxActionBase';

// Deterministic namespace for CI mode GUIDs, derived from the well-known URL
// namespace: uuidv5('spfx-cli:ci', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
const CI_NAMESPACE: string = '035a23a9-8c9e-569b-ae00-7ff2e4c82fb0';
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';

const CLI_VERSION: string = (require('../../../package.json') as { version: string }).version;

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

export class CreateAction extends SPFxActionBase {
  private readonly _targetDirParameter: IRequiredCommandLineStringParameter;
  private readonly _templateParameter: IRequiredCommandLineStringParameter;
  private readonly _libraryNameParameter: IRequiredCommandLineStringParameter;
  private readonly _componentNameParameter: IRequiredCommandLineStringParameter;
  private readonly _componentAliasParameter: CommandLineStringParameter;
  private readonly _componentDescriptionParameter: CommandLineStringParameter;
  private readonly _solutionNameParameter: CommandLineStringParameter;
  private readonly _packageManagerParameter: IRequiredCommandLineChoiceParameter<PackageManager | 'none'>;

  public constructor(terminal: Terminal) {
    super(
      {
        actionName: 'create',
        summary: 'Scaffolds an SPFx component into the current folder',
        documentation: 'This command creates a new SPFx component.'
      },
      terminal
    );

    this._targetDirParameter = this.defineStringParameter({
      parameterLongName: '--target-dir',
      argumentName: 'TARGET_DIR',
      description: 'The directory to create the solution (or where the solution already exists)',
      defaultValue: process.cwd()
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
      description: 'The solution name. If not provided, defaults to the hyphen-case component name.'
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

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: Terminal = this._terminal;
    const log: SPFxScaffoldLog = new SPFxScaffoldLog();

    try {
      const options: IScaffoldProfile = {
        localTemplateSources: this._localSourceParameter.values,
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

      if (this._localSourceParameter.values.length > 0) {
        if (this._spfxVersionParameter.value !== undefined) {
          terminal.writeWarningLine(
            `${this._spfxVersionParameter.longName} is ignored when ${this._localSourceParameter.longName} is specified.`
          );
        }
        this._addLocalTemplateSources(manager);
      } else {
        this._addGitHubTemplateSource(manager);
      }

      this._addRemoteSources(manager);

      const templates: SPFxTemplateCollection = await this._fetchTemplatesAsync(manager);

      const formattedTable: string = await templates.toFormattedStringAsync();
      terminal.writeLine(formattedTable);

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

      const rawSolutionName: string | undefined = this._solutionNameParameter.value?.trim();
      if (rawSolutionName !== undefined && !SOLUTION_NAME_PATTERN.test(rawSolutionName)) {
        throw new Error(
          `Invalid solution name: "${rawSolutionName}". Must contain only alphanumeric characters, hyphens, and underscores.`
        );
      }
      const solutionName: string = rawSolutionName || kebabCase(componentName);

      const renderContext: Record<string, string> = {
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
        componentName: componentName,
        componentDescription: componentDescription
      };

      const fs: MemFsEditor = await template.renderAsync(renderContext, targetDir, {
        retainPhaseScripts: ciMode
      });

      log.append({
        kind: 'template-rendered',
        templateName: template.name,
        templateVersion: template.version,
        spfxVersion: template.spfxVersion,
        context: renderContext,
        cliVersion: CLI_VERSION
      });

      _printFileChanges(this._terminal, fs, targetDir);
      const writer: SPFxTemplateWriter = new SPFxTemplateWriter();
      await writer.writeAsync(fs, targetDir, { log });

      const packageManager: PackageManager | 'none' = this._packageManagerParameter.value;
      log.append({
        kind: 'package-manager-selected',
        packageManager,
        targetDir
      });

      if (packageManager !== 'none') {
        const installResult: IInstallResult = await _runInstallAsync(packageManager, targetDir, terminal);

        log.append({
          kind: 'package-manager-install-completed',
          packageManager,
          exitCode: installResult.exitCode ?? -1,
          signal: installResult.signal ?? undefined
        });

        if (installResult.signal != null) {
          throw new Error(`${packageManager} install was terminated by signal ${installResult.signal}`);
        } else if (installResult.exitCode !== 0) {
          throw new Error(`${packageManager} install exited with code ${installResult.exitCode}`);
        }
      }
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      terminal.writeErrorLine(`Error creating SPFx component: ${message}`);
      throw error;
    }
  }
}

interface IInstallResult {
  // eslint-disable-next-line @rushstack/no-new-null
  exitCode: number | null;
  // eslint-disable-next-line @rushstack/no-new-null
  signal: string | null;
}

/**
 * Spawns the chosen package manager's install command in targetDir and waits for it to finish.
 * Files are already written before this is called, so a failure here does not undo scaffolding.
 *
 * @returns The exit code and signal so the caller can log the outcome before deciding to throw.
 */
async function _runInstallAsync(
  packageManager: PackageManager,
  targetDir: string,
  terminal: Terminal
): Promise<IInstallResult> {
  terminal.writeLine(`Running ${packageManager} install in ${targetDir}...`);

  const child: ChildProcess = Executable.spawn(packageManager, ['install'], {
    currentWorkingDirectory: targetDir,
    stdio: 'inherit'
  });

  const { exitCode, signal } = await Executable.waitForExitAsync(child, {
    throwOnNonZeroExitCode: false,
    throwOnSignal: false
  });

  if (exitCode === 0) {
    terminal.writeLine(`${packageManager} install completed successfully.`);
  }

  return { exitCode, signal };
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
