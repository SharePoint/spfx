// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { camelCase, kebabCase, snakeCase, upperFirst } from 'lodash';
import type { MemFsEditor } from 'mem-fs-editor';
import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';

import { Colorize, type Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  type CommandLineStringListParameter,
  type CommandLineStringParameter,
  type IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';
import {
  LocalFileSystemRepositorySource,
  type SPFxTemplateCollection,
  SPFxTemplateRepositoryManager,
  type SPFxTemplate
} from '@microsoft/spfx-template-api';

import { SOLUTION_NAME_PATTERN } from '../../utilcities/validation';

const CI_COMPONENT_ID: string = '11111111-1111-1111-1111-111111111111';
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';
const CI_FEATURE_ID: string = '33333333-3333-3333-3333-333333333333';

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
  private _terminal: Terminal;
  private readonly _targetDir: IRequiredCommandLineStringParameter;
  private readonly _template: IRequiredCommandLineStringParameter;
  private readonly _localTemplateSources: CommandLineStringListParameter;
  private readonly _libraryName: IRequiredCommandLineStringParameter;
  private readonly _componentName: IRequiredCommandLineStringParameter;
  private readonly _componentAlias: CommandLineStringParameter;
  private readonly _componentDescription: CommandLineStringParameter;
  private readonly _solutionName: CommandLineStringParameter;

  public constructor(terminal: Terminal) {
    super({
      actionName: 'create',
      summary: 'Scaffolds an SPFx component into the current folder',
      documentation: 'This command creates a new SPFx component.'
    });

    this._terminal = terminal;

    this._targetDir = this.defineStringParameter({
      parameterLongName: '--target-dir',
      argumentName: 'TARGET_DIR',
      description: 'The directory to create the solution (or where the solution already exists)',
      defaultValue: process.cwd()
    });

    this._localTemplateSources = this.defineStringListParameter({
      parameterLongName: '--local-template',
      argumentName: 'TEMPLATE_PATH',
      description: 'Path to a local template folder'
    });

    this._template = this.defineStringParameter({
      parameterLongName: '--template',
      argumentName: 'TEMPLATE_NAME',
      description: 'The template to use for scaffolding',
      required: true
    });

    this._libraryName = this.defineStringParameter({
      parameterLongName: '--library-name',
      argumentName: 'LIBRARY_NAME',
      description: 'The library name for the component',
      required: true
    });

    this._componentName = this.defineStringParameter({
      parameterLongName: '--component-name',
      argumentName: 'COMPONENT_NAME',
      description: 'The component name (e.g., "Hello World")',
      required: true
    });

    this._componentAlias = this.defineStringParameter({
      parameterLongName: '--component-alias',
      argumentName: 'COMPONENT_ALIAS',
      description: 'The component alias. If not provided, will use the component name.'
    });

    this._componentDescription = this.defineStringParameter({
      parameterLongName: '--component-description',
      argumentName: 'COMPONENT_DESCRIPTION',
      description: 'The component description. If not provided, will generate from component name.'
    });

    this._solutionName = this.defineStringParameter({
      parameterLongName: '--solution-name',
      argumentName: 'SOLUTION_NAME',
      description: 'The solution name. If not provided, defaults to the kebab-case component name.'
    });
  }

  protected async onExecuteAsync(): Promise<void> {
    try {
      const options: IScaffoldProfile = {
        localTemplateSources: this._localTemplateSources.values,
        templateName: this._template.value,
        targetDir: this._targetDir.value
      };

      const validationResult: z.ZodSafeParseResult<IScaffoldProfile> =
        ScaffoldProfileSchema.safeParse(options);
      if (!validationResult.success) {
        throw new Error(`Invalid scaffold profile: ${JSON.stringify(validationResult.error.issues)}`);
      }
      const { templateName, targetDir } = options;

      const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

      for (const localPath of this._localTemplateSources.values) {
        this._terminal.writeLine(`Adding local template source: ${localPath}`);
        manager.addSource(new LocalFileSystemRepositorySource(localPath));
      }

      const templates: SPFxTemplateCollection = await manager.getTemplatesAsync();

      this._terminal.writeLine(templates.toString());

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
      const componentId: string = ciMode ? CI_COMPONENT_ID : uuidv4();
      const solutionId: string = ciMode ? CI_SOLUTION_ID : uuidv4();
      const featureId: string = ciMode ? CI_FEATURE_ID : uuidv4();

      // Get component name and validate
      const componentName: string = this._componentName.value;
      if (!componentName || componentName.trim().length === 0) {
        throw new Error('Component name is required and cannot be empty or only whitespace.');
      }

      const componentAlias: string = this._componentAlias.value || componentName;
      const componentDescription: string = this._componentDescription.value || `${componentName} description`;

      // Compute name variants using lodash
      const componentNameCamelCase: string = camelCase(componentName);
      const componentNameHyphenCase: string = kebabCase(componentName);
      const componentNameCapitalCase: string = upperFirst(camelCase(componentName));
      const componentNameAllCaps: string = snakeCase(componentName).toUpperCase();

      const rawSolutionName: string | undefined = this._solutionName.value?.trim();
      if (rawSolutionName !== undefined && !SOLUTION_NAME_PATTERN.test(rawSolutionName)) {
        throw new Error(
          `Invalid solution name: "${rawSolutionName}". Must contain only alphanumeric characters, hyphens, and underscores.`
        );
      }
      const solutionName: string = rawSolutionName || componentNameHyphenCase;

      const fs: MemFsEditor = await template.renderAsync(
        {
          solution_name: solutionName,
          eslintProfile: 'react',
          libraryName: this._libraryName.value,
          spfxVersion: template.spfxVersion,
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
        targetDir
      );
      _printFileChanges(this._terminal, fs, targetDir);
      await template.write(fs);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);
      this._terminal.writeErrorLine(`Error creating SPFx component: ${message}`);
      throw error;
    }
  }
}

/**
 * Utility function to show the user which files in the in-memory file system are pending changes.
 */
function _printFileChanges(terminal: Terminal, fs: MemFsEditor, targetDir: string): void {
  terminal.writeLine(`targetDir: ${targetDir}`);
  const changed: { [key: string]: { state: 'modified' | 'deleted'; isNew: boolean } } = fs.dump(targetDir);

  terminal.writeLine();
  terminal.writeLine(Colorize.cyan('The following files will be modified:'));

  for (const [file, data] of Object.entries(changed)) {
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
