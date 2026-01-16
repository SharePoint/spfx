import { CommandLineParser } from '@rushstack/ts-command-line';
import { CreateAction } from './CreateAction';
import { Terminal } from '@rushstack/terminal';

export class SPFxCommandLineParser extends CommandLineParser {
  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'spfx-cli',
      toolDescription: 'CLI for managing SharePoint Framework (SPFx) projects'
    });

    this.addAction(new CreateAction(terminal));
  }
}
