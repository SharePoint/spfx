// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ToolboxCommandLine } from './cli/ToolboxCommandLine';

const commandLine: ToolboxCommandLine = new ToolboxCommandLine();
commandLine.executeAsync().catch(commandLine.terminal.writeErrorLine.bind(commandLine.terminal)); // CommandLineParser.executeAsync() should never reject the promise
