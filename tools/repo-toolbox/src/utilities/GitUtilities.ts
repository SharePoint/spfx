// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';

export async function getRepoSlugAsync(): Promise<string> {
  const result: string = await execGitAsync(['remote', 'get-url', 'origin']);
  const match: RegExpMatchArray | null = result.match(/github\.com[:/](.+\/[^.]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Could not extract repository slug from remote URL: ${result}`);
  }

  return match[1]!;
}

export async function getAuthHeaderAsync(): Promise<string> {
  // The checkout with persistCredentials sets an extraheader in git config
  // Format: "http.<url>.extraheader AUTHORIZATION: basic <token>"
  const result: string = await execGitAsync(['config', '--get-regexp', 'http\\..*\\.extraheader']);
  const headerValue: string | undefined = result.split(/\s+(.+)/)[1];
  if (!headerValue) {
    throw new Error(
      'Could not extract authorization header from git config. ' +
        'Ensure persistCredentials is enabled on the checkout step.'
    );
  }

  return headerValue;
}

export async function execGitAsync(args: string[]): Promise<string> {
  const result: ChildProcess = Executable.spawn('git', args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const { stdout } = await Executable.waitForExitAsync(result, {
    encoding: 'utf8',
    throwOnNonZeroExitCode: true,
    throwOnSignal: true
  });

  return stdout.trim();
}
