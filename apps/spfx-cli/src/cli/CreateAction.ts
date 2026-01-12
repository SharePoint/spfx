import {  Colorize, Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  CommandLineStringListParameter,
  CommandLineStringParameter,
  type IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';
import { MemFsEditor } from 'mem-fs-editor';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {    
  LocalFileSystemRepositorySource,
  SPFxTemplateCollection,
  SPFxTemplateRepositoryManager,
  SPFxTemplate
} from '@microsoft/spfx-template-api';

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
  private readonly _componentId: CommandLineStringParameter;
  private readonly _solutionId: CommandLineStringParameter;

  public constructor(terminal: Terminal) {

    super({
      actionName: 'create',
      summary: 'Scaffolds an SPFx component into the current folder',
      documentation:
        'This command creates a new SPFx component.'
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

    this._componentId = this.defineStringParameter({
      parameterLongName: '--component-id',
      argumentName: 'COMPONENT_ID',
      description: 'The unique component ID (GUID). If not provided, a new GUID will be generated.'
    });

    this._solutionId = this.defineStringParameter({
      parameterLongName: '--solution-id',
      argumentName: 'SOLUTION_ID',
      description: 'The unique solution ID (GUID). If not provided, a new GUID will be generated.'
    });
  }

  protected async onExecuteAsync(): Promise<void> {
    try {
      const options: IScaffoldProfile = {
        localTemplateSources: this._localTemplateSources.values,
        templateName: this._template.value,
        targetDir: this._targetDir.value
      };

      const validationResult = ScaffoldProfileSchema.safeParse(options);
      if (!validationResult.success) {
        throw new Error(`Invalid scaffold profile: ${JSON.stringify(validationResult.error.issues)}`);
      }
      const {
        templateName,
        targetDir
      } = options;

      const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

      for (const localPath of this._localTemplateSources.values) {
        this._terminal.writeLine(`Adding local template source: ${localPath}`);
        manager.addSource(new LocalFileSystemRepositorySource(localPath));
      }

      const templates: SPFxTemplateCollection = await manager.getTemplates();

      this._terminal.writeLine(templates.toString());

      const template: SPFxTemplate | undefined = templates.get(templateName);

      if (!template) {
          throw new Error(`Template not found: ${templateName}. Available: ${Array.from(templates.keys()).join(', ')}`);
      }

      // Generate a new GUID if componentId was not provided
      const componentId = this._componentId.value || uuidv4();
      const solutionId = this._solutionId.value || uuidv4();

      const fs = await template.render({
        solution_name: 'test-solution-name',
        eslintProfile: 'react',
        libraryName: this._libraryName.value,
        versionBadge: 'https://img.shields.io/badge/version-1.0.0-blue',
        componentId: componentId,
        componentAlias: 'MyWebPart',
        componentNameUnescaped: 'My Web Part',
        componentNameCamelCase: 'myWebPart',
        componentNameHypenCase: 'my-web-part',
        componentClassName: 'MyWebPart',
        componentStrings: 'MyWebPartStrings',
        componentDescription: 'My Web Part Description',
        solutionId: solutionId
      }, targetDir);
      _printFileChanges(this._terminal, fs, targetDir);
      await template.write(fs);

    } catch (error) {
      this._terminal.writeErrorLine(`Error creating SPFx component: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Utility function to show the user which files in the in-memory file system are pending changes.
 */
function _printFileChanges(terminal: Terminal, fs: MemFsEditor, targetDir: string): void {
    terminal.writeLine(`targetDir: ${targetDir}`);
    const changed: { [key: string]: { state: 'modified' | 'deleted', isNew: boolean } } = fs.dump('D:\\');

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