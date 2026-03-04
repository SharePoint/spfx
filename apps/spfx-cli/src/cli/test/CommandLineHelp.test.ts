import { AnsiEscape, Terminal, StringBufferTerminalProvider } from '@rushstack/terminal';

import { SPFxCommandLineParser } from '../SPFxCommandLineParser';

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
  it(`prints the help`, async () => {
    const parser: SPFxCommandLineParser = new SPFxCommandLineParser(
      new Terminal(new StringBufferTerminalProvider())
    );

    const globalHelpText: string = AnsiEscape.formatForTests(parser.renderHelpText());
    expect(globalHelpText).toMatchSnapshot('global help');

    for (const action of parser.actions) {
      const actionHelpText: string = AnsiEscape.formatForTests(action.renderHelpText());
      expect(actionHelpText).toMatchSnapshot(action.actionName);
    }
  });
});
