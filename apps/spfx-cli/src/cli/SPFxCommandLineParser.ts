// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import type { Terminal } from '@rushstack/terminal';

import { CreateAction } from './actions/CreateAction';
import { ListTemplatesAction } from './actions/ListTemplatesAction';

export class SPFxCommandLineParser extends CommandLineParser {
  public constructor(terminal: Terminal) {
    super({
      toolFilename: 'spfx',
      toolDescription: 'CLI for managing SharePoint Framework (SPFx) projects'
    });

    this.addAction(new CreateAction(terminal));
    this.addAction(new ListTemplatesAction(terminal));
  }
}
