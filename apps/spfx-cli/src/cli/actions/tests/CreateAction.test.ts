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

import { SOLUTION_NAME_PATTERN } from '../../../utilities/validation';
import { SPFxCommandLineParser } from '../../SPFxCommandLineParser';
import { SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME } from '../CreateAction';

const MockedManager = SPFxTemplateRepositoryManager as jest.MockedClass<typeof SPFxTemplateRepositoryManager>;
const MockedGitHub = PublicGitHubRepositorySource as jest.MockedClass<typeof PublicGitHubRepositorySource>;
const MockedLocal = LocalFileSystemRepositorySource as jest.MockedClass<
  typeof LocalFileSystemRepositorySource
>;

// Minimal mocks for a happy-path run
const mockMemFs = { dump: jest.fn().mockReturnValue({}) };
const mockTemplate = {
  renderAsync: jest.fn().mockResolvedValue(mockMemFs),
  spfxVersion: '1.22.1'
};
const mockCollection = new Map([['webpart-minimal', mockTemplate]]);
mockCollection.toString = () => '[Mocked SPFxTemplateCollection]';

const REQUIRED_ARGS: string[] = [
  '--template',
  'webpart-minimal',
  '--library-name',
  '@test/lib',
  '--component-name',
  'Test'
];

async function runCreateAsync(extraArgs: string[] = []): Promise<void> {
  const terminalProvider: StringBufferTerminalProvider = new StringBufferTerminalProvider();
  const parser: SPFxCommandLineParser = new SPFxCommandLineParser(new Terminal(terminalProvider));
  await parser.executeWithoutErrorHandlingAsync(['create', ...REQUIRED_ARGS, ...extraArgs]);
  expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toMatchSnapshot();
}

describe('SOLUTION_NAME_PATTERN', () => {
  it('should accept simple alphanumeric names', () => {
    expect(SOLUTION_NAME_PATTERN.test('my-solution')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('mySolution')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('solution123')).toBe(true);
  });

  it('should accept names with hyphens and underscores', () => {
    expect(SOLUTION_NAME_PATTERN.test('my-solution-name')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('my_solution_name')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('my-solution_name')).toBe(true);
  });

  it('should accept single character names', () => {
    expect(SOLUTION_NAME_PATTERN.test('a')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('Z')).toBe(true);
    expect(SOLUTION_NAME_PATTERN.test('9')).toBe(true);
  });

  it('should reject names starting with a hyphen or underscore', () => {
    expect(SOLUTION_NAME_PATTERN.test('-my-solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('_my-solution')).toBe(false);
  });

  it('should reject names with spaces', () => {
    expect(SOLUTION_NAME_PATTERN.test('my solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test(' my-solution')).toBe(false);
  });

  it('should reject names with special characters', () => {
    expect(SOLUTION_NAME_PATTERN.test('my@solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my.solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my/solution')).toBe(false);
    expect(SOLUTION_NAME_PATTERN.test('my!solution')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(SOLUTION_NAME_PATTERN.test('')).toBe(false);
  });
});

describe('CreateAction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME];

    MockedManager.prototype.getTemplatesAsync.mockResolvedValue(
      mockCollection as unknown as SPFxTemplateCollection
    );
    jest.spyOn(process, 'cwd').mockReturnValue('/tmp/test');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('source selection', () => {
    describe('without --local-template', () => {
      it('should add a PublicGitHubRepositorySource with the default URL', async () => {
        await runCreateAsync();
        expect(MockedGitHub).toHaveBeenCalledWith(
          'https://github.com/SharePoint/spfx',
          undefined,
          expect.anything()
        );
        expect(MockedLocal).not.toHaveBeenCalled();
      });

      it('should use SPFX_TEMPLATE_REPO_URL when set', async () => {
        process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/my-org/my-templates';
        await runCreateAsync();
        expect(MockedGitHub).toHaveBeenCalledWith(
          'https://github.com/my-org/my-templates',
          undefined,
          expect.anything()
        );
      });

      it('should pass the terminal instance to PublicGitHubRepositorySource', async () => {
        const terminal = new Terminal(new StringBufferTerminalProvider());
        const parser = new SPFxCommandLineParser(terminal);
        await parser.executeWithoutErrorHandlingAsync(['create', ...REQUIRED_ARGS]);
        expect(MockedGitHub).toHaveBeenCalledWith('https://github.com/SharePoint/spfx', undefined, terminal);
      });
    });

    describe('with --local-template', () => {
      it('should add a LocalFileSystemRepositorySource for the provided path', async () => {
        await runCreateAsync(['--local-template', '/path/to/templates']);
        expect(MockedLocal).toHaveBeenCalledWith('/path/to/templates');
        expect(MockedGitHub).not.toHaveBeenCalled();
      });

      it('should add multiple sources for multiple --local-template flags', async () => {
        await runCreateAsync(['--local-template', '/a', '--local-template', '/b']);
        expect(MockedLocal).toHaveBeenCalledTimes(2);
        expect(MockedLocal).toHaveBeenNthCalledWith(1, '/a');
        expect(MockedLocal).toHaveBeenNthCalledWith(2, '/b');
      });
    });
  });

  describe('URL normalization', () => {
    it('strips trailing slash', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx/';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('strips multiple trailing slashes', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx///';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('strips .git suffix', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('trims whitespace', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = '  https://github.com/SharePoint/spfx  ';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('handles .git then slash together', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git/';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });
  });

  describe('--spfx-version', () => {
    it('passes ref to PublicGitHubRepositorySource when --spfx-version is set', async () => {
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        '1.22',
        expect.anything()
      );
    });

    it('passes ref when SPFX_TEMPLATE_REPO_URL and --spfx-version are both set', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/my-org/my-templates';
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/my-org/my-templates',
        '1.22',
        expect.anything()
      );
    });

    it('uses --spfx-version over branch encoded in SPFX_TEMPLATE_REPO_URL /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        '1.22',
        expect.anything()
      );
    });

    it('is ignored (with no throw) when --local-template is also provided', async () => {
      await runCreateAsync(['--local-template', '/a', '--spfx-version', '1.22']);
      expect(MockedLocal).toHaveBeenCalledWith('/a');
      expect(MockedGitHub).not.toHaveBeenCalled();
    });
  });

  describe('URL /tree/ branch extraction', () => {
    it('extracts branch from /tree/ in SPFX_TEMPLATE_REPO_URL', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        'pending-fixes',
        expect.anything()
      );
    });

    it('handles version-like branch name in /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx/tree/1.22';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        '1.22',
        expect.anything()
      );
    });

    it('handles .git before /tree/', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git/tree/1.22';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        '1.22',
        expect.anything()
      );
    });

    it('passes undefined ref when URL has no /tree/ and no --spfx-version', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });

    it('extracts branch from /tree/ on a GHE host', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.mycompany.com/org/repo/tree/my-branch';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.mycompany.com/org/repo',
        'my-branch',
        expect.anything()
      );
    });

    it('ignores subdirectory suffix after the branch name in /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/main/some/subdir';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        'main',
        expect.anything()
      );
    });
  });

  describe('whitespace env var fix', () => {
    it('falls back to default URL when SPFX_TEMPLATE_REPO_URL is whitespace-only', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = '   ';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith(
        'https://github.com/SharePoint/spfx',
        undefined,
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('throws with a message mentioning --local-template when fetch fails', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runCreateAsync()).rejects.toThrow(/use --local-template/);
    });

    it('throws with a message mentioning "Failed to fetch templates"', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runCreateAsync()).rejects.toThrow(/Failed to fetch templates/);
    });

    it('preserves the original error as the cause', async () => {
      const originalError = new Error('ENOTFOUND');
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(originalError);
      let caughtError: unknown;
      try {
        await runCreateAsync();
      } catch (e) {
        caughtError = e;
      }
      expect((caughtError as { cause?: unknown }).cause).toBe(originalError);
    });

    it('includes the original error message in the wrapper', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
      await expect(runCreateAsync()).rejects.toThrow(/ENOTFOUND/);
    });

    it('handles non-Error rejected values', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue('plain string');
      await expect(runCreateAsync()).rejects.toThrow(/plain string/);
    });
  });
});
