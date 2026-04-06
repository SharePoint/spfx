// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import * as z from 'zod';

import { Executable, Path, type IWaitForExitResultWithoutOutput } from '@rushstack/node-core-library';
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
  SPFxScaffoldLog,
  type TemplateOutput,
  buildBuiltInContext,
  type ISPFxBuiltInContext,
  toHyphenCase,
  type PackageManager,
  tryReadPackageManagerFromPackageJsonEnginesAsync,
  writePackageManagerToPackageJsonEnginesAsync
} from '@microsoft/spfx-template-api';

import { SOLUTION_NAME_PATTERN } from '../../utilities/validation';
import { SPFxActionBase } from './SPFxActionBase';
import packageJson from '../../../package.json';

const CLI_VERSION: string = packageJson.version;

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
  private readonly _targetDirParameter: CommandLineStringParameter;
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
        summary: 'Scaffolds a new SPFx component',
        documentation: 'This command creates a new SPFx component.'
      },
      terminal
    );

    this._targetDirParameter = this.defineStringParameter({
      parameterLongName: '--target-dir',
      argumentName: 'TARGET_DIR',
      description:
        'The directory to scaffold into. When omitted, defaults to ' +
        'a subfolder named after the solution in the current working directory.'
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

    try {
      // Get component name and validate
      const componentName: string = this._componentNameParameter.value;
      if (!componentName || componentName.trim().length === 0) {
        throw new Error('Component name is required and cannot be empty or only whitespace.');
      }

      const rawSolutionName: string | undefined = this._solutionNameParameter.value?.trim();
      if (rawSolutionName !== undefined && !SOLUTION_NAME_PATTERN.test(rawSolutionName)) {
        throw new Error(
          `Invalid solution name: "${rawSolutionName}". Must contain only alphanumeric characters, hyphens, and underscores.`
        );
      }
      // Compute a preliminary hyphen-case solution name for targetDir before the
      // template is loaded. buildBuiltInContext will produce the same value.
      const solutionName: string = rawSolutionName || toHyphenCase(componentName);

      const rawTargetDir: string | undefined = this._targetDirParameter.value?.trim();
      const targetDir: string =
        rawTargetDir && rawTargetDir.length > 0 ? rawTargetDir : `${process.cwd()}/${solutionName}`;

      const log: SPFxScaffoldLog = await SPFxScaffoldLog.loadFromFolderAsync(targetDir);
      const isExistingProject: boolean = log.hasEntries;

      log.append({
        kind: 'session-started',
        cliVersion: CLI_VERSION
      });

      const templateName: string = this._templateParameter.value;
      const options: IScaffoldProfile = {
        localTemplateSources: this._localSourceParameter.values,
        templateName,
        targetDir
      };

      const validationResult: z.ZodSafeParseResult<IScaffoldProfile> =
        ScaffoldProfileSchema.safeParse(options);
      if (!validationResult.success) {
        throw new Error(`Invalid scaffold profile: ${JSON.stringify(validationResult.error.issues)}`);
      }

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

      // CI mode is read from an environment variable instead of a ts-command-line
      // parameter so it stays out of --help output. It is an internal/undocumented
      // flag used only by CI pipelines and tests to produce deterministic output.
      // eslint-disable-next-line dot-notation
      const ciMode: boolean = process.env['SPFX_CI_MODE'] === '1';

      const builtInContext: ISPFxBuiltInContext = buildBuiltInContext(
        {
          componentName,
          libraryName: this._libraryNameParameter.value,
          spfxVersion: template.spfxVersion,
          solutionName: rawSolutionName || undefined,
          componentAlias: this._componentAliasParameter.value?.trim() || undefined,
          componentDescription: this._componentDescriptionParameter.value?.trim() || undefined
        },
        { ciMode }
      );

      // Spread into Record<string, string> because ISPFxBuiltInContext uses named
      // keys (for type-safe BUILT_IN_PARAMETER_NAMES) while renderAsync needs a
      // general-purpose Record.
      const renderContext: Record<string, string> = { ...builtInContext };

      const templateFs: TemplateOutput = await template.renderAsync(renderContext, {
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

      const packageManager: PackageManager | 'none' = this._packageManagerParameter.value;
      const previousPackageManager: PackageManager | undefined =
        await tryReadPackageManagerFromPackageJsonEnginesAsync(targetDir);

      _printFileChanges(this._terminal, templateFs, targetDir);
      const writer: SPFxTemplateWriter = new SPFxTemplateWriter();
      await writer.writeAsync(templateFs, targetDir, { log });

      if (packageManager !== 'none') {
        let resolvedPackageManager: PackageManager = packageManager;

        if (isExistingProject && previousPackageManager && previousPackageManager !== packageManager) {
          const packageManagerParameterLongName: string = this._packageManagerParameter.longName;
          terminal.writeWarningLine(
            `${packageManagerParameterLongName} "${packageManager}" is overridden by ` +
              `"${previousPackageManager}" from the existing project's \`package.json\` \`engines\` field. ` +
              `The ${packageManagerParameterLongName} parameter will be ignored.`
          );
          resolvedPackageManager = previousPackageManager;
        }

        log.append({
          kind: 'package-manager-selected',
          packageManager: resolvedPackageManager,
          targetDir
        });

        await _runInstallAsync(resolvedPackageManager, targetDir, terminal, log);
        await writePackageManagerToPackageJsonEnginesAsync(resolvedPackageManager, targetDir, terminal);
      }

      await log.saveToFolderAsync(targetDir);
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
 *
 * Appends a `package-manager-install-completed` event to the log and throws on failure.
 */
async function _runInstallAsync(
  packageManager: PackageManager,
  targetDir: string,
  terminal: Terminal,
  log: SPFxScaffoldLog
): Promise<void> {
  terminal.writeLine(`Running ${packageManager} install in ${targetDir}...`);

  const child: ChildProcess = Executable.spawn(packageManager, ['install'], {
    currentWorkingDirectory: targetDir,
    stdio: 'inherit'
  });

  const result: IWaitForExitResultWithoutOutput = await Executable.waitForExitAsync(child, {
    throwOnNonZeroExitCode: false,
    throwOnSignal: false
  });

  const normalizedExitCode: number = result.exitCode ?? -1;

  log.append({
    kind: 'package-manager-install-completed',
    packageManager,
    exitCode: normalizedExitCode,
    signal: result.signal ?? undefined
  });

  if (result.signal != null) {
    throw new Error(`${packageManager} install was terminated by signal ${result.signal}`);
  } else if (normalizedExitCode !== 0) {
    throw new Error(`${packageManager} install exited with code ${normalizedExitCode}`);
  }

  terminal.writeLine(`${packageManager} install completed successfully.`);
}

/**
 * Utility function to show the user which files in the in-memory file system are pending changes.
 */
function _printFileChanges(terminal: Terminal, templateFs: TemplateOutput, targetDir: string): void {
  terminal.writeLine(`targetDir: ${targetDir}`);

  terminal.writeLine();
  terminal.writeLine(Colorize.cyan('The following files will be generated:'));

  const sortedFiles: string[] = Array.from(templateFs.files.keys()).sort();

  for (const file of sortedFiles) {
    terminal.writeLine(Colorize.green(`  ${Path.convertToSlashes(file)}`));
  }

  terminal.writeLine();
}
