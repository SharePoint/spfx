// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { AnsiEscape, Terminal, StringBufferTerminalProvider } from '@rushstack/terminal';

import { SPFxCommandLineParser } from '../SPFxCommandLineParser';
import packageJson from '../../../package.json';

describe('CommandLineHelp', () => {
  beforeEach(() => {
    // ts-command-line calls process.exit() which interferes with Jest
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Test code called process.exit(${code})`);
    });

    jest.spyOn(process, 'cwd').mockReturnValue('<cwd>');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  it(`prints the help`, async () => {
    const parser: SPFxCommandLineParser = new SPFxCommandLineParser(
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

  it.each(['--version', '-v'])('prints the CLI version for %s', async (versionFlag) => {
    const terminalProvider: StringBufferTerminalProvider = new StringBufferTerminalProvider();
    const parser: SPFxCommandLineParser = new SPFxCommandLineParser(new Terminal(terminalProvider));

    await parser.executeWithoutErrorHandlingAsync([versionFlag]);

    expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toEqual([
      `[    log] ${packageJson.version}[n]`
    ]);
  });
});
