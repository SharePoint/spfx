// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

import { SPFxCommandLineParser } from './cli/SPFxCommandLineParser';

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());

async function main(): Promise<void> {
  const commandLine: SPFxCommandLineParser = new SPFxCommandLineParser(terminal);

  await commandLine.executeAsync();
}

// Execute the CLI if this file is run directly
main().catch((error) => {
  terminal.writeErrorLine('Error:', error.toString());
  process.exit(1);
});
