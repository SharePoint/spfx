// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import { ConsoleTerminalProvider, type ITerminal, Terminal } from '@rushstack/terminal';

import { CreateOrUpdatePrAction } from './actions/CreateOrUpdatePrAction';
import { FindBumpPipelineRunAction } from './actions/FindBumpPipelineRunAction';
import { PublishTarballsAction } from './actions/PublishTarballsAction';

export class ToolboxCommandLine extends CommandLineParser {
  public readonly terminal: ITerminal;

  public constructor() {
    super({
      toolFilename: 'repo-toolbox',
      toolDescription: 'Used to execute various operations specific to this repo'
    });

    const terminal: ITerminal = new Terminal(new ConsoleTerminalProvider());
    this.terminal = terminal;

    this.addAction(new CreateOrUpdatePrAction(terminal));
    this.addAction(new FindBumpPipelineRunAction(terminal));
    this.addAction(new PublishTarballsAction(terminal));
  }
}
