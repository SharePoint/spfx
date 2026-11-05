// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { GitHubClient, parseGitHubAuthorizationHeader } from '../GitHubClient';

describe(GitHubClient.name, () => {
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

    it('passes through basic-auth with a non-x-access-token username unchanged', () => {
      const encoded: string = Buffer.from('someuser:somepassword').toString('base64');
      const input: string = `basic ${encoded}`;
      const { header } = parseGitHubAuthorizationHeader(input);
      expect(header).toBe(input);
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
