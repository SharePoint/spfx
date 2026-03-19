// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';
import { AnsiEscape } from '@rushstack/terminal';

import { REPO_ROOT, CLI_PATH } from './constants';

export interface IScaffoldOptions {
  templateName: string;
  targetDir: string;
  localTemplatePath: string;
  libraryName: string;
  componentName: string;
  componentAlias?: string;
  componentDescription?: string;
  solutionName?: string;
}

/**
 * Helper to run the scaffolding CLI for a given template into a target directory.
 */
export async function scaffoldAsync(options: IScaffoldOptions): Promise<void> {
  const {
    templateName,
    targetDir,
    localTemplatePath,
    libraryName,
    componentName,
    componentAlias,
    componentDescription,
    solutionName
  } = options;

  const args: string[] = [
    CLI_PATH,
    'create',
    '--template',
    templateName,
    '--target-dir',
    targetDir,
    '--local-template',
    localTemplatePath,
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

  if (solutionName) {
    args.push('--solution-name', solutionName);
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
  normalizedStdout = normalizedStdout.replaceAll(targetDir, '<TARGET_DIR>');
  normalizedStdout = AnsiEscape.formatForTests(normalizedStdout);
  expect(normalizedStdout).toMatchSnapshot('stdout');

  expect(stderr).toBe('');
}
