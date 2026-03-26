// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@microsoft/spfx-template-api');
jest.mock('@rushstack/node-core-library', () => {
  const actual = jest.requireActual('@rushstack/node-core-library');
  return {
    ...actual,
    Executable: {
      // Only spawn and waitForExitAsync are called by CreateAction; other methods
      // fall through to the real implementation via the ...actual.Executable spread.
      ...actual.Executable,
      spawn: jest.fn(),
      waitForExitAsync: jest.fn()
    }
  };
});

jest.spyOn(process, 'cwd').mockReturnValue('/tmp/test');

import { Executable } from '@rushstack/node-core-library';
import { Terminal, StringBufferTerminalProvider } from '@rushstack/terminal';
import {
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  SPFxTemplateRepositoryManager
} from '@microsoft/spfx-template-api';
import type { SPFxTemplateCollection } from '@microsoft/spfx-template-api';

import { SOLUTION_NAME_PATTERN } from '../../../utilities/validation';
import { SPFxCommandLineParser } from '../../SPFxCommandLineParser';
import { SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME } from '../../../utilities/github';

const MockedManager = SPFxTemplateRepositoryManager as jest.MockedClass<typeof SPFxTemplateRepositoryManager>;
const MockedGitHub = PublicGitHubRepositorySource as jest.MockedClass<typeof PublicGitHubRepositorySource>;
const MockedLocal = LocalFileSystemRepositorySource as jest.MockedClass<
  typeof LocalFileSystemRepositorySource
>;
const MockedExecutable = Executable as unknown as { spawn: jest.Mock; waitForExitAsync: jest.Mock };

// Minimal mocks for a happy-path run
const mockMemFs = { dump: jest.fn().mockReturnValue({}) };

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
  let mockTemplate: { renderAsync: jest.Mock; spfxVersion: string };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME];

    mockTemplate = {
      renderAsync: jest.fn().mockResolvedValue(mockMemFs),
      spfxVersion: '1.22.1'
    };
    const mockCollection = new Map([['webpart-minimal', mockTemplate]]) as unknown as SPFxTemplateCollection;
    (mockCollection as unknown as { toFormattedStringAsync: () => Promise<string> }).toFormattedStringAsync =
      jest.fn().mockResolvedValue('[Mocked SPFxTemplateCollection]');

    MockedManager.prototype.getTemplatesAsync.mockResolvedValue(mockCollection);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('source selection', () => {
    describe('without --local-source', () => {
      it('should add a PublicGitHubRepositorySource with the default URL', async () => {
        await runCreateAsync();
        expect(MockedGitHub).toHaveBeenCalledWith({
          repoUrl: 'https://github.com/SharePoint/spfx',
          branch: undefined,
          terminal: expect.anything()
        });
        expect(MockedLocal).not.toHaveBeenCalled();
      });

      it('should use SPFX_TEMPLATE_REPO_URL when set', async () => {
        process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/my-org/my-templates';
        await runCreateAsync();
        expect(MockedGitHub).toHaveBeenCalledWith({
          repoUrl: 'https://github.com/my-org/my-templates',
          branch: undefined,
          terminal: expect.anything()
        });
      });

      it('should pass the terminal instance to PublicGitHubRepositorySource', async () => {
        const terminal = new Terminal(new StringBufferTerminalProvider());
        const parser = new SPFxCommandLineParser(terminal);
        await parser.executeWithoutErrorHandlingAsync(['create', ...REQUIRED_ARGS]);
        expect(MockedGitHub).toHaveBeenCalledWith({
          repoUrl: 'https://github.com/SharePoint/spfx',
          branch: undefined,
          terminal
        });
      });
    });

    describe('with --local-source', () => {
      it('should add a LocalFileSystemRepositorySource for the provided path', async () => {
        await runCreateAsync(['--local-source', '/path/to/templates']);
        expect(MockedLocal).toHaveBeenCalledWith('/path/to/templates');
        expect(MockedGitHub).not.toHaveBeenCalled();
      });

      it('should add multiple sources for multiple --local-source flags', async () => {
        await runCreateAsync(['--local-source', '/a', '--local-source', '/b']);
        expect(MockedLocal).toHaveBeenCalledTimes(2);
        expect(MockedLocal).toHaveBeenNthCalledWith(1, '/a');
        expect(MockedLocal).toHaveBeenNthCalledWith(2, '/b');
      });
    });

    describe('with --remote-source', () => {
      it('adds an extra PublicGitHubRepositorySource alongside the default', async () => {
        await runCreateAsync(['--remote-source', 'https://github.com/my-org/my-templates']);
        expect(MockedGitHub).toHaveBeenCalledTimes(2);
        // First call: default source
        expect(MockedGitHub).toHaveBeenNthCalledWith(1, {
          repoUrl: 'https://github.com/SharePoint/spfx',
          branch: undefined,
          terminal: expect.anything()
        });
        // Second call: remote source
        expect(MockedGitHub).toHaveBeenNthCalledWith(2, {
          repoUrl: 'https://github.com/my-org/my-templates',
          branch: undefined,
          terminal: expect.anything()
        });
      });

      it('adds multiple remote sources for multiple --remote-source flags', async () => {
        await runCreateAsync([
          '--remote-source',
          'https://github.com/org1/repo1',
          '--remote-source',
          'https://github.com/org2/repo2'
        ]);
        // default + 2 remote = 3 total
        expect(MockedGitHub).toHaveBeenCalledTimes(3);
      });

      it('extracts branch from /tree/ in --remote-source URL', async () => {
        await runCreateAsync(['--remote-source', 'https://github.com/my-org/my-templates/tree/my-branch']);
        expect(MockedGitHub).toHaveBeenNthCalledWith(2, {
          repoUrl: 'https://github.com/my-org/my-templates',
          branch: 'my-branch',
          terminal: expect.anything()
        });
      });

      it('works alongside --local-source without adding the default GitHub source', async () => {
        await runCreateAsync([
          '--local-source',
          '/path/to/templates',
          '--remote-source',
          'https://github.com/my-org/my-templates'
        ]);
        expect(MockedLocal).toHaveBeenCalledWith('/path/to/templates');
        // Only the remote source — no default GitHub
        expect(MockedGitHub).toHaveBeenCalledTimes(1);
        expect(MockedGitHub).toHaveBeenCalledWith({
          repoUrl: 'https://github.com/my-org/my-templates',
          branch: undefined,
          terminal: expect.anything()
        });
      });
    });
  });

  describe('URL normalization', () => {
    it('strips trailing slash', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx/';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });

    it('strips multiple trailing slashes', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx///';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });

    it('strips .git suffix', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });

    it('trims whitespace', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = '  https://github.com/SharePoint/spfx  ';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });

    it('handles .git then slash together', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git/';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });
  });

  describe('--spfx-version', () => {
    it('passes ref to PublicGitHubRepositorySource when --spfx-version is set', async () => {
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: 'version/1.22',
        terminal: expect.anything()
      });
    });

    it('passes ref when SPFX_TEMPLATE_REPO_URL and --spfx-version are both set', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/my-org/my-templates';
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/my-org/my-templates',
        branch: 'version/1.22',
        terminal: expect.anything()
      });
    });

    it('uses --spfx-version over branch encoded in SPFX_TEMPLATE_REPO_URL /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runCreateAsync(['--spfx-version', '1.22']);
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: 'version/1.22',
        terminal: expect.anything()
      });
    });

    it('is ignored (with no throw) when --local-source is also provided', async () => {
      await runCreateAsync(['--local-source', '/a', '--spfx-version', '1.22']);
      expect(MockedLocal).toHaveBeenCalledWith('/a');
      expect(MockedGitHub).not.toHaveBeenCalled();
    });
  });

  describe('URL /tree/ branch extraction', () => {
    it('extracts branch from /tree/ in SPFX_TEMPLATE_REPO_URL', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/pending-fixes';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: 'pending-fixes',
        terminal: expect.anything()
      });
    });

    it('handles version-like branch name in /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx/tree/1.22';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: '1.22',
        terminal: expect.anything()
      });
    });

    it('handles .git before /tree/', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx.git/tree/1.22';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: '1.22',
        terminal: expect.anything()
      });
    });

    it('passes undefined ref when URL has no /tree/ and no --spfx-version', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = 'https://github.com/SharePoint/spfx';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });

    it('extracts branch from /tree/ on a GHE host', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.mycompany.com/org/repo/tree/my-branch';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.mycompany.com/org/repo',
        branch: 'my-branch',
        terminal: expect.anything()
      });
    });

    it('ignores subdirectory suffix after the branch name in /tree/ path', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] =
        'https://github.com/SharePoint/spfx/tree/main/some/subdir';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: 'main',
        terminal: expect.anything()
      });
    });
  });

  describe('whitespace env var fix', () => {
    it('falls back to default URL when SPFX_TEMPLATE_REPO_URL is whitespace-only', async () => {
      process.env[SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME] = '   ';
      await runCreateAsync();
      expect(MockedGitHub).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/SharePoint/spfx',
        branch: undefined,
        terminal: expect.anything()
      });
    });
  });

  describe('spfxVersionForBadgeUrl', () => {
    it('escapes hyphens in prerelease versions for shields.io badge URLs', async () => {
      mockTemplate.spfxVersion = '1.23.0-beta.0';
      await runCreateAsync();
      expect(mockTemplate.renderAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          spfxVersion: '1.23.0-beta.0',
          spfxVersionForBadgeUrl: '1.23.0--beta.0'
        }),
        expect.anything(),
        expect.anything()
      );
      mockTemplate.spfxVersion = '1.22.1';
    });

    it('leaves stable versions unchanged', async () => {
      mockTemplate.spfxVersion = '1.22.1';
      await runCreateAsync();
      expect(mockTemplate.renderAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          spfxVersion: '1.22.1',
          spfxVersionForBadgeUrl: '1.22.1'
        }),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('--package-manager', () => {
    beforeEach(() => {
      MockedExecutable.spawn.mockReturnValue({});
      MockedExecutable.waitForExitAsync.mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
        signal: null
      });
    });

    it('runs npm install when --package-manager npm is passed', async () => {
      await runCreateAsync(['--package-manager', 'npm']);
      expect(MockedExecutable.spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({ currentWorkingDirectory: '/tmp/test' })
      );
    });

    it('runs pnpm install when --package-manager pnpm is passed', async () => {
      await runCreateAsync(['--package-manager', 'pnpm']);
      expect(MockedExecutable.spawn).toHaveBeenCalledWith(
        'pnpm',
        ['install'],
        expect.objectContaining({ currentWorkingDirectory: '/tmp/test' })
      );
    });

    it('runs yarn install when --package-manager yarn is passed', async () => {
      await runCreateAsync(['--package-manager', 'yarn']);
      expect(MockedExecutable.spawn).toHaveBeenCalledWith(
        'yarn',
        ['install'],
        expect.objectContaining({ currentWorkingDirectory: '/tmp/test' })
      );
    });

    it('uses stdio: inherit so package manager output reaches the user', async () => {
      await runCreateAsync(['--package-manager', 'npm']);
      expect(MockedExecutable.spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('installs into --target-dir when explicitly provided', async () => {
      await runCreateAsync(['--package-manager', 'npm', '--target-dir', '/custom/dir']);
      expect(MockedExecutable.spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({ currentWorkingDirectory: '/custom/dir' })
      );
    });

    it('does not run install when --package-manager none is passed', async () => {
      await runCreateAsync(['--package-manager', 'none']);
      expect(MockedExecutable.spawn).not.toHaveBeenCalled();
    });

    it('does not run install when --package-manager is omitted', async () => {
      await runCreateAsync();
      expect(MockedExecutable.spawn).not.toHaveBeenCalled();
    });

    it('does not run install when scaffolding fails before writing', async () => {
      MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('network error'));
      await expect(runCreateAsync(['--package-manager', 'npm'])).rejects.toThrow();
      expect(MockedExecutable.spawn).not.toHaveBeenCalled();
    });

    it('surfaces install failure but leaves scaffolded files intact', async () => {
      MockedExecutable.waitForExitAsync.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: '',
        signal: null
      });
      await expect(runCreateAsync(['--package-manager', 'npm'])).rejects.toThrow(
        /npm install exited with code 1/
      );
    });

    it('surfaces signal termination with the signal name in the error message', async () => {
      MockedExecutable.waitForExitAsync.mockResolvedValue({
        exitCode: null,
        stdout: '',
        stderr: '',
        signal: 'SIGTERM'
      });
      await expect(runCreateAsync(['--package-manager', 'npm'])).rejects.toThrow(
        /npm install was terminated by signal SIGTERM/
      );
    });
  });

  describe('error handling', () => {
    describe('when using GitHub source (no --local-source)', () => {
      it('suggests --local-source when fetch fails', async () => {
        MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOTFOUND'));
        await expect(runCreateAsync()).rejects.toThrow(/use --local-source/);
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

    describe('when using --local-source', () => {
      it('does not suggest --local-source when local source fails', async () => {
        MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOENT: no such file'));
        await expect(runCreateAsync(['--local-source', '/bad/path'])).rejects.not.toThrow(
          /use --local-source/
        );
      });

      it('mentions verifying the local template paths', async () => {
        MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOENT: no such file'));
        await expect(runCreateAsync(['--local-source', '/bad/path'])).rejects.toThrow(
          /Verify that the specified --local-source path\(s\) exist/
        );
      });

      it('preserves the original error as the cause', async () => {
        const originalError = new Error('ENOENT: no such file');
        MockedManager.prototype.getTemplatesAsync.mockRejectedValue(originalError);
        let caughtError: unknown;
        try {
          await runCreateAsync(['--local-source', '/bad/path']);
        } catch (e) {
          caughtError = e;
        }
        expect((caughtError as { cause?: unknown }).cause).toBe(originalError);
      });

      it('includes the original error message in the wrapper', async () => {
        MockedManager.prototype.getTemplatesAsync.mockRejectedValue(new Error('ENOENT: no such file'));
        await expect(runCreateAsync(['--local-source', '/bad/path'])).rejects.toThrow(/ENOENT: no such file/);
      });
    });
  });
});
