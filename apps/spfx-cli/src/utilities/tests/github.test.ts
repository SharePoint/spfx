// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { parseGitHubUrlAndRef } from '../github';

describe(parseGitHubUrlAndRef.name, () => {
  describe('plain URLs (no /tree/ segment)', () => {
    it('returns the URL unchanged and undefined ref', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });

    it('strips a trailing slash', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo/')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });

    it('strips multiple trailing slashes', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo///')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });

    it('strips .git suffix', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo.git')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });

    it('strips .git suffix and trailing slash together', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo.git/')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });

    it('trims leading and trailing whitespace', () => {
      expect(parseGitHubUrlAndRef('  https://github.com/owner/repo  ')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: undefined
      });
    });
  });

  describe('/tree/ branch extraction', () => {
    it('extracts a simple branch name from /tree/', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo/tree/main')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: 'main'
      });
    });

    it('extracts a version-like branch name', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo/tree/1.22')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: '1.22'
      });
    });

    it('strips .git before /tree/', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo.git/tree/main')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: 'main'
      });
    });

    it('ignores subdirectory suffix after the branch segment', () => {
      expect(parseGitHubUrlAndRef('https://github.com/owner/repo/tree/main/some/subdir')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: 'main'
      });
    });

    it('works on GitHub Enterprise hosts', () => {
      expect(parseGitHubUrlAndRef('https://github.mycompany.com/org/repo/tree/my-branch')).toEqual({
        repoUrl: 'https://github.mycompany.com/org/repo',
        urlBranch: 'my-branch'
      });
    });

    it('trims whitespace before parsing /tree/', () => {
      expect(parseGitHubUrlAndRef('  https://github.com/owner/repo/tree/main  ')).toEqual({
        repoUrl: 'https://github.com/owner/repo',
        urlBranch: 'main'
      });
    });
  });
});
