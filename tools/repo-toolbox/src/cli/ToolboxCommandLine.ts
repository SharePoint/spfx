// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import { ConsoleTerminalProvider, type ITerminal, Terminal } from '@rushstack/terminal';

import { CreateOrUpdatePrAction } from './actions/CreateOrUpdatePrAction';
import { DownloadBumpArtifactsAction } from './actions/DownloadBumpArtifactsAction';
import { PublishTarballsAction } from './actions/PublishTarballsAction';
import { ValidateVersionBumpAction } from './actions/ValidateVersionBumpAction';

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
    this.addAction(new DownloadBumpArtifactsAction(terminal));
    this.addAction(new PublishTarballsAction(terminal));
    this.addAction(new ValidateVersionBumpAction(terminal));
  }
}
