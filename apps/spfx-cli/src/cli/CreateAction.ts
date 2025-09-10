import { Terminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  CommandLineStringListParameter,
  type IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';

import { scaffold } from '@microsoft/spfx-template-api';

export class CreateAction extends CommandLineAction {
  private _terminal: Terminal;
  private readonly _targetDir: IRequiredCommandLineStringParameter;
  private readonly _template: IRequiredCommandLineStringParameter;
  private readonly _localTemplateSources: CommandLineStringListParameter;

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
  }

  protected async onExecuteAsync(): Promise<void> {
    try {
        await scaffold({
            localTemplateSources: this._localTemplateSources.values,
            templateName: this._template.value,
            targetDir: this._targetDir.value
        }, this._terminal);
    } catch (error) {
      this._terminal.writeErrorLine(`Error creating SPFx component: ${error.message}`);
      throw error;
    }
  }
}
