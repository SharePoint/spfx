// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';
import type { ITerminal } from '@rushstack/terminal';

const GIT_BIN_NAME: 'git' = 'git';

export async function getRepoSlugAsync(terminal: ITerminal): Promise<string> {
  const result: string = await execGitAsync(['remote', 'get-url', 'origin'], terminal);
  const match: RegExpMatchArray | null = result.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Could not extract repository slug from remote URL: ${result}`);
  }

  return match[1]!;
}

export async function getGitAuthorizationHeaderAsync(terminal: ITerminal): Promise<string> {
  // The checkout with persistCredentials sets an extraheader in git config
  // Format: "http.<url>.extraheader AUTHORIZATION: basic <token>"
  const result: string = await execGitAsync(['config', '--get-regexp', 'http\\..*\\.extraheader'], terminal);
  const headerLine: string | undefined = result.split(/\s+(.+)/)[1];
  if (!headerLine) {
    throw new Error(
      'Could not extract authorization header from git config. ' +
        'Ensure persistCredentials is enabled on the checkout step.'
    );
  }

  // headerLine is "AUTHORIZATION: basic <token>" — strip the header name prefix
  // to get just the value ("basic <token>") for use with fetch.
  const colonIndex: number = headerLine.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Unexpected authorization header format: ${headerLine}`);
  }

  return headerLine.substring(colonIndex + 1).trim();
}

/**
 * Normalizes various token formats to a proper GitHub API Authorization header value.
 *
 * Git checkout extraheaders use `basic base64(x-access-token:ghs_xxx)`, which GitHub
 * App installation tokens don't support — they require `token ghs_xxx`.
 */
export function normalizeGitHubAuthorizationHeader(value: string): string {
  if (!value.includes(' ')) {
    // Raw token with no scheme prefix
    return `token ${value}`;
  }

  const spaceIndex: number = value.indexOf(' ');
  const scheme: string = value.substring(0, spaceIndex);
  const encoded: string = value.substring(spaceIndex + 1);
  if (scheme.toLowerCase() === 'basic' && encoded) {
    const decoded: string = Buffer.from(encoded, 'base64').toString('utf8');
    const colonIndex: number = decoded.indexOf(':');
    if (colonIndex !== -1) {
      const token: string = decoded.substring(colonIndex + 1);
      if (token) {
        return `token ${token}`;
      }
    }
  }

  // Already "token xxx", "bearer xxx", etc.
  return value;
}

export async function execGitAsync(args: string[], terminal: ITerminal): Promise<string> {
  terminal.writeLine(`> ${GIT_BIN_NAME} ${args.join(' ')}`);
  const result: ChildProcess = Executable.spawn(GIT_BIN_NAME, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const { stdout } = await Executable.waitForExitAsync(result, {
    encoding: 'utf8',
    throwOnNonZeroExitCode: true,
    throwOnSignal: true
  });

  return stdout.trim();
}
