// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import type { Terminal } from '@rushstack/terminal';

import { CreateAction } from './actions/CreateAction';
import { ListTemplatesAction } from './actions/ListTemplatesAction';
import packageJson from '../../package.json';

const CLI_VERSION: string = packageJson.version;

export class SPFxCommandLineParser extends CommandLineParser {
  private readonly _terminal: Terminal;

  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'spfx',
      toolDescription: 'CLI for managing SharePoint Framework (SPFx) projects'
    });

    this._terminal = terminal;

    this.defineFlagParameter({
      parameterLongName: '--version',
      parameterShortName: '-v',
      description: 'Show the CLI version and exit.'
    });

    this.addAction(new CreateAction(terminal));
    this.addAction(new ListTemplatesAction(terminal));
  }

  public override async executeWithoutErrorHandlingAsync(args?: string[]): Promise<void> {
    const effectiveArgs: string[] = args ?? process.argv.slice(2);

    if (effectiveArgs.length === 1 && (effectiveArgs[0] === '--version' || effectiveArgs[0] === '-v')) {
      this._terminal.writeLine(CLI_VERSION);
      return;
    }

    await super.executeWithoutErrorHandlingAsync(args);
  }
}
