// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';
import { StringBufferTerminalProvider, Terminal } from '@rushstack/terminal';

import { getGitAuthorizationHeaderAsync, getRepoSlugAsync } from '../GitUtilities';

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
    it('extracts authorization header value from git config entry', async () => {
      mockGitStdout('http.https://github.com/.extraheader AUTHORIZATION: basic abc123');

      await expect(getGitAuthorizationHeaderAsync(terminal)).resolves.toBe('basic abc123');
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
});
