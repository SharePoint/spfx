// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';
import { StringBufferTerminalProvider, Terminal } from '@rushstack/terminal';

import {
  getGitAuthorizationHeaderAsync,
  getRepoSlugAsync,
  parseGitHubAuthorizationHeader
} from '../GitUtilities';

describe('GitUtilities', () => {
  let terminalProvider: StringBufferTerminalProvider;
  let terminal: Terminal;

  beforeEach(() => {
    terminalProvider = new StringBufferTerminalProvider(true);
    terminal = new Terminal(terminalProvider);
  });

  afterEach(() => {
    expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toMatchSnapshot();
    jest.restoreAllMocks();
  });

  function mockGitStdout(stdout: string): void {
    jest.spyOn(Executable, 'spawn').mockReturnValue({} as ChildProcess);
    jest.spyOn(Executable, 'waitForExitAsync').mockResolvedValue({ stdout } as never);
  }

  describe(getRepoSlugAsync.name, () => {
    it('extracts slug from SSH remote with dotted repository name', async () => {
      mockGitStdout('git@github.com:octo-org/my.repo.name.git\n');

      await expect(getRepoSlugAsync(terminal)).resolves.toBe('octo-org/my.repo.name');
    });

    it('extracts slug from HTTPS remote without .git suffix', async () => {
      mockGitStdout('https://github.com/octo-org/my.repo');

      await expect(getRepoSlugAsync(terminal)).resolves.toBe('octo-org/my.repo');
    });

    it('throws for non-GitHub remote URL', async () => {
      mockGitStdout('https://dev.azure.com/org/project/_git/repo');

      await expect(getRepoSlugAsync(terminal)).rejects.toThrow('Could not extract repository slug');
    });
  });

  describe(getGitAuthorizationHeaderAsync.name, () => {
    it('normalizes basic-auth extraheader with a GitHub App token', async () => {
      // Simulate "basic base64(x-access-token:ghs_abc123)" as stored by git checkout
      const encoded: string = Buffer.from('x-access-token:ghs_abc123').toString('base64');
      mockGitStdout(`http.https://github.com/.extraheader AUTHORIZATION: basic ${encoded}`);

      const { header } = await getGitAuthorizationHeaderAsync(terminal);
      expect(header).toBe('token ghs_abc123');
    });

    it('throws when git config output has no header value', async () => {
      mockGitStdout('');

      await expect(getGitAuthorizationHeaderAsync(terminal)).rejects.toThrow(
        'Could not extract authorization header from git config'
      );
    });

    it('throws when header line is missing colon', async () => {
      mockGitStdout('http.https://github.com/.extraheader AUTHORIZATION basic abc123');

      await expect(getGitAuthorizationHeaderAsync(terminal)).rejects.toThrow(
        'Unexpected authorization header format'
      );
    });
  });

  describe(parseGitHubAuthorizationHeader.name, () => {
    it('wraps a raw token with "token" scheme', () => {
      const { header } = parseGitHubAuthorizationHeader('ghs_abc123');
      expect(header).toBe('token ghs_abc123');
    });

    it('decodes basic-auth with x-access-token prefix to "token" scheme', () => {
      const encoded: string = Buffer.from('x-access-token:ghs_abc123').toString('base64');
      const { header } = parseGitHubAuthorizationHeader(`basic ${encoded}`);
      expect(header).toBe('token ghs_abc123');
    });

    it('passes through an already-normalized "token" header unchanged', () => {
      const { header } = parseGitHubAuthorizationHeader('token ghs_abc123');
      expect(header).toBe('token ghs_abc123');
    });

    it('passes through a "bearer" header unchanged', () => {
      const { header } = parseGitHubAuthorizationHeader('bearer ghs_abc123');
      expect(header).toBe('bearer ghs_abc123');
    });

    it('trims leading and trailing whitespace', () => {
      const { header } = parseGitHubAuthorizationHeader('  token ghs_abc123  ');
      expect(header).toBe('token ghs_abc123');
    });

    it.each([
      ['raw token (no scheme)', 'ghs_abc123'],
      [
        'basic auth (base64 x-access-token)',
        `basic ${Buffer.from('x-access-token:ghs_abc123').toString('base64')}`
      ],
      ['"token" scheme', 'token ghs_abc123'],
      ['"bearer" scheme', 'bearer ghs_abc123']
    ])(
      'is idempotent for %s',
      (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _label,
        input
      ) => {
        const { header: once } = parseGitHubAuthorizationHeader(input);
        const { header: twice } = parseGitHubAuthorizationHeader(once);
        expect(twice).toBe(once);
      }
    );
  });
});
