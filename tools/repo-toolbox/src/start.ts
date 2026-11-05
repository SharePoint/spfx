// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

import { ToolboxCommandLine } from './cli/ToolboxCommandLine';

const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());
const commandLine: ToolboxCommandLine = new ToolboxCommandLine(terminal);
commandLine.executeAsync().catch(terminal.writeErrorLine.bind(terminal)); // CommandLineParser.executeAsync() should never reject the promise
