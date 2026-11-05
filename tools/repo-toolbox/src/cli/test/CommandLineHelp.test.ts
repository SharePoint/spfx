// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { AnsiEscape, StringBufferTerminalProvider, Terminal } from '@rushstack/terminal';

import { ToolboxCommandLine } from '../ToolboxCommandLine';

describe('CommandLineHelp', () => {
  beforeEach(() => {
    // ts-command-line calls process.exit() which interferes with Jest
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Test code called process.exit(${code})`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`prints the help`, () => {
    const parser: ToolboxCommandLine = new ToolboxCommandLine(
      new Terminal(new StringBufferTerminalProvider())
    );

    const globalHelpText: string = AnsiEscape.formatForTests(parser.renderHelpText()).replace(
      /[ \t]+$/gm,
      ''
    );
    expect(globalHelpText).toMatchSnapshot('global help');

    for (const action of parser.actions) {
      const actionHelpText: string = AnsiEscape.formatForTests(action.renderHelpText()).replace(
        /[ \t]+$/gm,
        ''
      );
      expect(actionHelpText).toMatchSnapshot(action.actionName);
    }
  });
});
