// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';
import { AnsiEscape } from '@rushstack/terminal';

import { REPO_ROOT, CLI_PATH, TEMPLATES_DIR } from './constants';

export interface IScaffoldOptions {
  templateName: string;
  targetDir: string;
  libraryName: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
}

/**
 * Helper to run the scaffolding CLI for a given template into a target directory.
 */
export async function scaffoldAsync(options: IScaffoldOptions): Promise<void> {
  const { templateName, targetDir, libraryName, componentName, componentAlias, componentDescription } =
    options;
  const args: string[] = [
    CLI_PATH,
    'create',
    '--template',
    templateName,
    '--target-dir',
    targetDir,
    '--local-template',
    TEMPLATES_DIR,
    '--library-name',
    libraryName,
    '--component-name',
    componentName
  ];

  if (componentAlias) {
    args.push('--component-alias', componentAlias);
  }

  if (componentDescription) {
    args.push('--component-description', componentDescription);
  }

  const childProcess: ChildProcess = Executable.spawn(process.argv0, args, {
    currentWorkingDirectory: REPO_ROOT,
    environment: { ...process.env, SPFX_CI_MODE: '1' }
  });
  const { stdout, stderr } = await Executable.waitForExitAsync(childProcess, {
    throwOnNonZeroExitCode: true,
    throwOnSignal: true,
    encoding: 'utf8'
  });

  let normalizedStdout: string = stdout.replaceAll(REPO_ROOT, '<REPO_ROOT>');
  normalizedStdout = AnsiEscape.formatForTests(stdout);
  expect(normalizedStdout).toMatchSnapshot('stdout');

  expect(stderr).toBe('');
}
