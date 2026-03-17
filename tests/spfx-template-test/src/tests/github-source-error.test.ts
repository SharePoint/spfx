// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { Executable } from '@rushstack/node-core-library';

import { CLI_PATH, REPO_ROOT } from './constants';

describe('CreateAction GitHub source error handling', () => {
  jest.setTimeout(30000);

  it('shows a helpful error message when the GitHub URL is unreachable', () => {
    const result = Executable.spawnSync(
      'node',
      [
        CLI_PATH,
        'create',
        '--template',
        'webpart-minimal',
        '--library-name',
        '@test/lib',
        '--component-name',
        'Test'
        // No --local-template → takes the GitHub path
      ],
      {
        currentWorkingDirectory: REPO_ROOT,
        environment: {
          ...process.env,
          SPFX_CI_MODE: '1',
          SPFX_TEMPLATE_REPO_URL: 'https://localhost:19999/nonexistent'
        },
        stdio: 'pipe'
      }
    );

    expect(result.status).not.toBe(0);
    const output: string = (result.stdout || '') + (result.stderr || '');
    expect(output).toMatch(/Failed to fetch templates/);
    expect(output).toMatch(/use --local-template/);
  });
});
