// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@microsoft/spfx-template-api');

import { Terminal, StringBufferTerminalProvider } from '@rushstack/terminal';
import {
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  SPFxTemplateRepositoryManager
} from '@microsoft/spfx-template-api';
import type { SPFxTemplateCollection } from '@microsoft/spfx-template-api';

import { SPFxCommandLineParser } from '../../SPFxCommandLineParser';
import { SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME } from '../../../utilities/github';

const MockedManager = SPFxTemplateRepositoryManager as jest.MockedClass<typeof SPFxTemplateRepositoryManager>;
const MockedGitHub = PublicGitHubRepositorySource as jest.MockedClass<typeof PublicGitHubRepositorySource>;
const MockedLocal = LocalFileSystemRepositorySource as jest.MockedClass<
  typeof LocalFileSystemRepositorySource
>;

async function runListAsync(extraArgs: string[] = []): Promise<void> {
  const terminalProvider: StringBufferTerminalProvider = new StringBufferTerminalProvider();
  const parser: SPFxCommandLineParser = new SPFxCommandLineParser(new Terminal(terminalProvider));
  await parser.executeWithoutErrorHandlingAsync(['list-templates', ...extraArgs]);
  expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toMatchSnapshot();
}

describe('ListTemplatesAction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME];

    const mockCollection = new Map([['webpart-minimal', {}]]);
    mockCollection.toString = (): string =>
      [
        '# of templates: 1',
        '',
        'Template Name: webpart-minimal',
        'Description: A minimal web part template (no framework) for SPFx',
        'Version: 0.0.1',
        'SPFx Version: 1.22.2',
        'Number of Files: 23',
        ''
      ].join('\n');

    MockedManager.prototype.getTemplatesAsync.mockResolvedValue(
      mockCollection as unknown as SPFxTemplateCollection
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('default source (always included)', () => {
    it('adds PublicGitHubRepositorySource with the default URL', async () => {
      await runListAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('uses SPFX_TEMPLATE_REPO_URL when set', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/my-org/my-templates';
      await runListAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/my-org/my-templates',
        undefined,
        expect.anything()
      );
    });

    it('falls back to default URL when SPFX_TEMPLATE_REPO_URL is whitespace-only', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = '   ';
      await runListAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('passes the terminal instance to PublicGitHubRepositorySource', async () => {
      const terminal: Terminal = new Terminal(new StringBufferTerminalProvider());
      const parser: SPFxCommandLineParser = new SPFxCommandLineParser(terminal);
      await parser.executeWithoutErrorHandlingAsync(['list-templates']);
      expect(MockedGitHub).toHaveBeenCalledWith('https://github.com/SharePoint/spfx', undefined, terminal);
    });
  });

  describe('--spfx-version', () => {
    it('passes ref to default PublicGitHubRepositorySource', async () => {
      await runListAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        'version/1.22',
        expect.anything()
      );
    });

    it('takes precedence over branch encoded in SPFX_TEMPLATE_REPO_URL /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runListAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        'version/1.22',
        expect.anything()
      );
    });

    it('extracts branch from /tree/ in SPFX_TEMPLATE_REPO_URL when no --spfx-version', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runListAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        'pending-fixes',
        expect.anything()
      );
    });
  });

  describe('--local-source (additive)', () => {
    it('adds LocalFileSystemRepositorySource AND still includes the default GitHub source', async () => {
      await runListAsync(['--local-source', '/path/to/templates']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
      expect(MockedLocal).toHaveBeenCalledWith('/path/to/templates');
    });

    it('adds multiple local sources for multiple --local-source flags', async () => {
      await runListAsync(['--local-source', '/a', '--local-source', '/b']);
      expect(MockedLocal).toHaveBeenCalledTimes(2);
      expect(MockedLocal).toHaveBeenNthCalledWith(1, '/a');
      expect(MockedLocal).toHaveBeenNthCalledWith(2, '/b');
      expect(MockedGitHub).toHaveBeenCalledTimes(1);
    });
  });

  describe('--remote-source (additive)', () => {
    it('adds an extra PublicGitHubRepositorySource alongside the default', async () => {
      await runListAsync(['--remote-source', 'https://github.com/my-org/my-templates']);
      expect(MockedGitHub).toHaveBeenCalledTimes(2);
      expect(MockedGitHub).toHaveBeenNthCalledWith(
        1,
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
      expect(MockedGitHub).toHaveBeenNthCalledWith(
        2,
        'https://github.com/my-org/my-templates',
        undefined,
        expect.anything()
      );
    });

    it('extracts branch from /tree/ in --remote-source URL', async () => {
      await runListAsync(['--remote-source', 'https://github.com/my-org/my-templates/tree/my-branch']);
      expect(MockedGitHub).toHaveBeenNthCalledWith(
        2,
        'https://github.com/my-org/my-templates',
        'my-branch',
        expect.anything()
      );
    });

    it('adds multiple remote sources for multiple --remote-source flags', async () => {
      await runListAsync([
        '--remote-source',
        'https://github.com/org1/repo1',
        '--remote-source',
        'https://github.com/org2/repo2'
      ]);
      expect(MockedGitHub).toHaveBeenCalledTimes(3);
    });
  });

  describe('combined --local-source and --remote-source', () => {
    it('adds default GitHub, local, and remote sources all together', async () => {
      await runListAsync([
        '--local-source',
        '/local/path',
        '--remote-source',
        'https://github.com/my-org/extra-templates'
      ]);
      expect(MockedGitHub).toHaveBeenCalledTimes(2);
      expect(MockedLocal).toHaveBeenCalledWith('/local/path');
    });
  });

  describe('error handling', () => {
    it('throws with a message mentioning --local-source when fetch fails', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runListAsync()).rejects.toThrow(/use --local-source/);
    });

    it('throws with a message mentioning "Failed to fetch templates"', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runListAsync()).rejects.toThrow(/Failed to fetch templates/);
    });

    it('preserves the original error as the cause', async () => {
      const originalError: Error = new Error('ENOTFOUND');
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(originalError);
      let caughtError: unknown;
      try {
        await runListAsync();
      } catch (e) {
        caughtError = e;
      }
      expect((caughtError as { cause?: unknown }).cause).toBe(originalError);
    });

    it('includes the original error message in the wrapper', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runListAsync()).rejects.toThrow(/ENOTFOUND/);
    });

    it('handles non-Error rejected values', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue('plain string');
      await expect(runListAsync()).rejects.toThrow(/plain string/);
    });
  });
});
