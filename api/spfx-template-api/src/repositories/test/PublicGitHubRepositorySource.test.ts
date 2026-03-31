// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('adm-zip');
jest.mock('../../templating/SPFxTemplate');

import AdmZip from 'adm-zip';
import { Terminal, StringBufferTerminalProvider } from '@rushstack/terminal';
import {
  PublicGitHubRepositorySource,
  _parseTemplatesFromFileMapAsync,
  _createTemplateFromFileMapAsync
} from '../PublicGitHubRepositorySource';
import { SPFxTemplate } from '../../templating/SPFxTemplate';

// Mock global fetch
global.fetch = jest.fn();

describe(PublicGitHubRepositorySource.name, () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockFromMemoryAsync = SPFxTemplate.fromMemoryAsync as jest.MockedFunction<
    typeof SPFxTemplate.fromMemoryAsync
  >;

  let terminalProvider: StringBufferTerminalProvider;
  let terminal: Terminal;

  beforeEach(() => {
    jest.clearAllMocks();
    terminalProvider = new StringBufferTerminalProvider();
    terminal = new Terminal(terminalProvider);
  });

  afterEach(() => {
    expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toMatchSnapshot();
  });

  describe('constructor', () => {
    it('should create an instance with repository URI', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      expect(source['_repoUrl']).toBe('https://github.com/owner/repo');
      expect(source.kind).toBe('github');
    });

    it('should use default branch "version/latest" when not specified', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      expect(source['_ref']).toBe('version/latest');
    });

    it('should use specified branch', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        branch: 'develop',
        terminal
      });

      expect(source['_ref']).toBe('develop');
    });

    it('should use provided terminal', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      expect(source['_terminal']).toBe(terminal);
    });

    it('should store token when provided', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        token: 'ghp_abc123',
        terminal
      });

      expect(source['_token']).toBe('ghp_abc123');
    });

    it('should have undefined token when not provided', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      expect(source['_token']).toBeUndefined();
    });
  });

  describe('kind property', () => {
    it('should always be "github"', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      expect(source.kind).toBe('github');
    });
  });

  describe('_parseRepoUrl', () => {
    it('should parse valid GitHub HTTPS URL', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      const result = source['_parseRepoUrl']();

      expect(result).toEqual({ host: 'github.com', owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub URL with .git extension', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo.git',
        terminal
      });
      const result = source['_parseRepoUrl']();

      expect(result).toEqual({ host: 'github.com', owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub Enterprise URL', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.mycompany.com/org/repo',
        terminal
      });
      const result = source['_parseRepoUrl']();

      expect(result).toEqual({ host: 'github.mycompany.com', owner: 'org', repo: 'repo' });
    });

    it('should parse GitHub Enterprise URL with .git extension', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.mycompany.com/org/repo.git',
        terminal
      });
      const result = source['_parseRepoUrl']();

      expect(result).toEqual({ host: 'github.mycompany.com', owner: 'org', repo: 'repo' });
    });

    it('should normalize host to lowercase', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://GitHub.COM/owner/repo',
        terminal
      });
      const result = source['_parseRepoUrl']();

      expect(result).toEqual({ host: 'github.com', owner: 'owner', repo: 'repo' });
    });

    it('should reject http:// URLs', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'http://github.com/owner/repo',
        terminal
      });

      expect(() => source['_parseRepoUrl']()).toThrow(/Invalid GitHub repository URL/);
    });

    it('should throw error for URL with only one path segment', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner',
        terminal
      });

      expect(() => source['_parseRepoUrl']()).toThrow(/Invalid GitHub repository URL/);
    });

    it('should throw error for URL with no path', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com',
        terminal
      });

      expect(() => source['_parseRepoUrl']()).toThrow(/Invalid GitHub repository URL/);
    });
  });

  describe('_buildDownloadUrl', () => {
    it('should build codeload URL for github.com', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        branch: 'main',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/owner/repo/zip/main');
    });

    it('should build correct download URL for custom branch', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        branch: 'feature-branch',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/owner/repo/zip/feature-branch');
    });

    it('should build correct download URL with different owner and repo', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/microsoft/spfx',
        branch: 'v1.18',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/microsoft/spfx/zip/v1.18');
    });

    it('should use codeload URL for mixed-case GitHub.com host', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://GitHub.COM/owner/repo',
        branch: 'main',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/owner/repo/zip/main');
    });

    it('should build GHE REST API URL for non-github.com hosts', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.mycompany.com/org/repo',
        branch: 'main',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://github.mycompany.com/api/v3/repos/org/repo/zipball/main');
    });

    it('should build GHE URL with default branch', () => {
      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.mycompany.com/org/repo',
        terminal
      });
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://github.mycompany.com/api/v3/repos/org/repo/zipball/version/latest');
    });
  });

  describe('_extractZipBuffer', () => {
    it('should extract files from zip buffer', () => {
      const mockEntries = [
        {
          entryName: 'repo-main/file1.txt',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from('content1'))
        },
        {
          entryName: 'repo-main/folder/file2.txt',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from('content2'))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      const zipBuffer = Buffer.from('fake zip');
      const result = source['_extractZipBuffer'](zipBuffer);

      expect(result.size).toBe(2);
      expect(result.get('file1.txt')).toEqual(Buffer.from('content1'));
      expect(result.get('folder/file2.txt')).toEqual(Buffer.from('content2'));
    });

    it('should skip directories', () => {
      const mockEntries = [
        {
          entryName: 'repo-main/folder/',
          isDirectory: true
        },
        {
          entryName: 'repo-main/file.txt',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from('content'))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      const result = source['_extractZipBuffer'](Buffer.from('fake zip'));

      expect(result.size).toBe(1);
      expect(result.has('folder/')).toBe(false);
    });

    it('should remove root directory prefix', () => {
      const mockEntries = [
        {
          entryName: 'repo-branch/src/index.ts',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from('code'))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      const result = source['_extractZipBuffer'](Buffer.from('fake zip'));

      expect(result.has('repo-branch/src/index.ts')).toBe(false);
      expect(result.has('src/index.ts')).toBe(true);
    });
  });

  describe('_parseTemplatesFromFileMapAsync', () => {
    it('should find templates with template.json files', async () => {
      const mockTemplate = { name: 'Template1', unknownFields: [] } as unknown as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['webpart/src/index.ts', Buffer.from('code')]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const templates = await _parseTemplatesFromFileMapAsync(terminal, fileMap);

      expect(templates).toHaveLength(1);
      expect(mockFromMemoryAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple templates', async () => {
      const mockTemplate1 = { name: 'Template1', unknownFields: [] } as unknown as SPFxTemplate;
      const mockTemplate2 = { name: 'Template2', unknownFields: [] } as unknown as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['extension/template.json', Buffer.from(JSON.stringify({ name: 'Extension' }))]
      ]);

      mockFromMemoryAsync.mockResolvedValueOnce(mockTemplate1).mockResolvedValueOnce(mockTemplate2);

      const templates = await _parseTemplatesFromFileMapAsync(terminal, fileMap);

      expect(templates).toHaveLength(2);
    });

    it('should handle template.json in root', async () => {
      const mockTemplate = { name: 'RootTemplate', unknownFields: [] } as unknown as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['template.json', Buffer.from(JSON.stringify({ name: 'Root' }))]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const templates = await _parseTemplatesFromFileMapAsync(terminal, fileMap);

      expect(templates).toHaveLength(1);
    });

    it('should log warning and continue when template parsing fails', async () => {
      const mockTemplate = { name: 'ValidTemplate', unknownFields: [] } as unknown as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['valid/template.json', Buffer.from(JSON.stringify({ name: 'Valid' }))],
        ['invalid/template.json', Buffer.from(JSON.stringify({ name: 'Invalid' }))]
      ]);

      mockFromMemoryAsync
        .mockResolvedValueOnce(mockTemplate)
        .mockRejectedValueOnce(new Error('Invalid template'));

      const templates = await _parseTemplatesFromFileMapAsync(terminal, fileMap);

      expect(templates).toHaveLength(1);
    });
  });

  describe('_createTemplateFromFileMapAsync', () => {
    it('should create template from file map', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const templateJson = {
        name: 'Test Template',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify(templateJson))],
        ['webpart/src/index.ts', Buffer.from('code')],
        ['webpart/README.md', Buffer.from('readme')]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const result = await _createTemplateFromFileMapAsync('webpart', fileMap);

      expect(result).toBe(mockTemplate);
      expect(mockFromMemoryAsync).toHaveBeenCalledWith('webpart', templateJson, expect.any(Map));
    });

    it('should return undefined if template.json not found', async () => {
      const fileMap = new Map<string, Buffer>([['webpart/src/index.ts', Buffer.from('code')]]);

      const result = await _createTemplateFromFileMapAsync('webpart', fileMap);

      expect(result).toBeUndefined();
    });

    it('should include only files from the template directory', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['webpart/src/index.ts', Buffer.from('webpart code')],
        ['extension/src/index.ts', Buffer.from('extension code')]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      await _createTemplateFromFileMapAsync('webpart', fileMap);

      const capturedFileMap = mockFromMemoryAsync.mock.calls[0]?.[2];
      expect(capturedFileMap?.size).toBe(2); // template.json and src/index.ts
      expect(capturedFileMap?.has('template.json')).toBe(true);
      expect(capturedFileMap?.has('src/index.ts')).toBe(true);
    });

    it('should throw error for invalid template.json', async () => {
      const fileMap = new Map<string, Buffer>([['webpart/template.json', Buffer.from('invalid json {')]]);

      await expect(_createTemplateFromFileMapAsync('webpart', fileMap)).rejects.toThrow(
        /Failed to parse template.json/
      );
    });
  });

  describe('getTemplates', () => {
    it('should fetch and extract templates from GitHub', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const templateJson = {
        name: 'Test',
        version: '1.0.0',
        spfxVersion: '1.18.0'
      };

      const mockEntries = [
        {
          entryName: 'repo-main/webpart/template.json',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(templateJson)))
        },
        {
          entryName: 'repo-main/webpart/src/index.ts',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from('code'))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as Response);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      const templates = await source.getTemplatesAsync();

      expect(mockFetch).toHaveBeenCalledWith('https://codeload.github.com/owner/repo/zip/version/latest', {});
      expect(templates).toHaveLength(1);
    });

    it('should send Authorization header when token is provided', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const mockEntries = [
        {
          entryName: 'repo-main/webpart/template.json',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify({ name: 'T' })))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as Response);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        token: 'ghp_abc123',
        terminal
      });
      await source.getTemplatesAsync();

      expect(mockFetch).toHaveBeenCalledWith('https://codeload.github.com/owner/repo/zip/version/latest', {
        headers: { Authorization: 'token ghp_abc123' }
      });
    });

    it('should not send Authorization header when no token', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const mockEntries = [
        {
          entryName: 'repo-main/webpart/template.json',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify({ name: 'T' })))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as Response);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });
      await source.getTemplatesAsync();

      expect(mockFetch).toHaveBeenCalledWith('https://codeload.github.com/owner/repo/zip/version/latest', {});
    });

    it('should use GHE API URL for enterprise hosts', async () => {
      const mockTemplate = { name: 'Template', unknownFields: [] } as unknown as SPFxTemplate;

      const mockEntries = [
        {
          entryName: 'repo-main/webpart/template.json',
          isDirectory: false,
          getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify({ name: 'T' })))
        }
      ];

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(
        () =>
          ({
            getEntries: jest.fn().mockReturnValue(mockEntries)
          }) as unknown as AdmZip
      );

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as Response);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.mycompany.com/org/repo',
        branch: 'main',
        token: 'ghp_enterprise_token',
        terminal
      });
      await source.getTemplatesAsync();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.mycompany.com/api/v3/repos/org/repo/zipball/main',
        { headers: { Authorization: 'token ghp_enterprise_token' } }
      );
    });

    it('should throw error when download fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as unknown as Response);

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      await expect(source.getTemplatesAsync()).rejects.toThrow(
        /Failed to fetch templates from GitHub repository/
      );
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const source = new PublicGitHubRepositorySource({
        repoUrl: 'https://github.com/owner/repo',
        terminal
      });

      await expect(source.getTemplatesAsync()).rejects.toThrow(
        /Failed to fetch templates from GitHub repository/
      );
    });
  });
});
