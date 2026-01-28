jest.mock('adm-zip');
jest.mock('@rushstack/terminal');
jest.mock('../templating/SPFxTemplate');

import AdmZip from 'adm-zip';
import { Terminal, ConsoleTerminalProvider } from '@rushstack/terminal';
import { PublicGitHubRepositorySource } from './PublicGitHubRepositorySource';
import { SPFxTemplate } from '../templating/SPFxTemplate';

// Mock global fetch
global.fetch = jest.fn();

describe('PublicGitHubRepositorySource', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockFromMemoryAsync = SPFxTemplate.fromMemoryAsync as jest.MockedFunction<
    typeof SPFxTemplate.fromMemoryAsync
  >;

  let mockTerminal: Terminal;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTerminal = {
      writeWarningLine: jest.fn(),
      writeLine: jest.fn(),
      writeErrorLine: jest.fn()
    } as unknown as Terminal;

    (Terminal as jest.MockedClass<typeof Terminal>).mockImplementation(() => mockTerminal);
  });

  describe('constructor', () => {
    it('should create an instance with repository URI', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      expect(source['_repoUri']).toBe('https://github.com/owner/repo');
      expect(source.type).toBe('github');
    });

    it('should use default branch "main" when not specified', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      expect(source['_ref']).toBe('main');
    });

    it('should use specified branch', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo', 'develop');

      expect(source['_ref']).toBe('develop');
    });

    it('should create default terminal when not provided', () => {
      new PublicGitHubRepositorySource('https://github.com/owner/repo');

      expect(Terminal).toHaveBeenCalledWith(expect.any(ConsoleTerminalProvider));
    });

    it('should use provided terminal', () => {
      const customTerminal = {
        writeWarningLine: jest.fn()
      } as unknown as Terminal;

      const source = new PublicGitHubRepositorySource(
        'https://github.com/owner/repo',
        'main',
        customTerminal
      );

      expect(source['_terminal']).toBe(customTerminal);
    });
  });

  describe('type property', () => {
    it('should always be "github"', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      expect(source.type).toBe('github');
    });
  });

  describe('_parseGitHubUrl', () => {
    it('should parse valid GitHub HTTPS URL', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const result = source['_parseGitHubUrl']();

      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse GitHub URL with .git extension', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo.git');
      const result = source['_parseGitHubUrl']();

      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should throw error for invalid URL', () => {
      const source = new PublicGitHubRepositorySource('https://invalid.com/repo');

      expect(() => source['_parseGitHubUrl']()).toThrow(/Invalid GitHub repository URL/);
    });

    it('should throw error for malformed GitHub URL', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner');

      expect(() => source['_parseGitHubUrl']()).toThrow(/Invalid GitHub repository URL/);
    });
  });

  describe('_buildDownloadUrl', () => {
    it('should build correct download URL for main branch', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo', 'main');
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/owner/repo/zip/main');
    });

    it('should build correct download URL for custom branch', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo', 'feature-branch');
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/owner/repo/zip/feature-branch');
    });

    it('should build correct download URL with different owner and repo', () => {
      const source = new PublicGitHubRepositorySource('https://github.com/microsoft/spfx', 'v1.18');
      const url = source['_buildDownloadUrl']();

      expect(url).toBe('https://codeload.github.com/microsoft/spfx/zip/v1.18');
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

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(() => ({
        getEntries: jest.fn().mockReturnValue(mockEntries)
      } as unknown as AdmZip));

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
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

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(() => ({
        getEntries: jest.fn().mockReturnValue(mockEntries)
      } as unknown as AdmZip));

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
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

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(() => ({
        getEntries: jest.fn().mockReturnValue(mockEntries)
      } as unknown as AdmZip));

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const result = source['_extractZipBuffer'](Buffer.from('fake zip'));

      expect(result.has('repo-branch/src/index.ts')).toBe(false);
      expect(result.has('src/index.ts')).toBe(true);
    });
  });

  describe('_parseTemplatesFromFileMap', () => {
    it('should find templates with template.json files', async () => {
      const mockTemplate = { name: 'Template1' } as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['webpart/src/index.ts', Buffer.from('code')]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const templates = await source['_parseTemplatesFromFileMap'](fileMap);

      expect(templates).toHaveLength(1);
      expect(mockFromMemoryAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple templates', async () => {
      const mockTemplate1 = { name: 'Template1' } as SPFxTemplate;
      const mockTemplate2 = { name: 'Template2' } as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['extension/template.json', Buffer.from(JSON.stringify({ name: 'Extension' }))]
      ]);

      mockFromMemoryAsync
        .mockResolvedValueOnce(mockTemplate1)
        .mockResolvedValueOnce(mockTemplate2);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const templates = await source['_parseTemplatesFromFileMap'](fileMap);

      expect(templates).toHaveLength(2);
    });

    it('should handle template.json in root', async () => {
      const mockTemplate = { name: 'RootTemplate' } as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['template.json', Buffer.from(JSON.stringify({ name: 'Root' }))]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const templates = await source['_parseTemplatesFromFileMap'](fileMap);

      expect(templates).toHaveLength(1);
    });

    it('should log warning and continue when template parsing fails', async () => {
      const mockTemplate = { name: 'ValidTemplate' } as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['valid/template.json', Buffer.from(JSON.stringify({ name: 'Valid' }))],
        ['invalid/template.json', Buffer.from(JSON.stringify({ name: 'Invalid' }))]
      ]);

      mockFromMemoryAsync
        .mockResolvedValueOnce(mockTemplate)
        .mockRejectedValueOnce(new Error('Invalid template'));

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo', 'main', mockTerminal);
      const templates = await source['_parseTemplatesFromFileMap'](fileMap);

      expect(templates).toHaveLength(1);
      expect(mockTerminal.writeWarningLine).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse template from directory invalid')
      );
    });
  });

  describe('_createTemplateFromFileMap', () => {
    it('should create template from file map', async () => {
      const mockTemplate = { name: 'Template' } as SPFxTemplate;

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

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const result = await source['_createTemplateFromFileMap']('webpart', fileMap);

      expect(result).toBe(mockTemplate);
      expect(mockFromMemoryAsync).toHaveBeenCalledWith(
        'webpart',
        templateJson,
        expect.any(Map)
      );
    });

    it('should return undefined if template.json not found', async () => {
      const fileMap = new Map<string, Buffer>([
        ['webpart/src/index.ts', Buffer.from('code')]
      ]);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const result = await source['_createTemplateFromFileMap']('webpart', fileMap);

      expect(result).toBeUndefined();
    });

    it('should include only files from the template directory', async () => {
      const mockTemplate = { name: 'Template' } as SPFxTemplate;

      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from(JSON.stringify({ name: 'WebPart' }))],
        ['webpart/src/index.ts', Buffer.from('webpart code')],
        ['extension/src/index.ts', Buffer.from('extension code')]
      ]);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      await source['_createTemplateFromFileMap']('webpart', fileMap);

      const capturedFileMap = mockFromMemoryAsync.mock.calls[0][2];
      expect(capturedFileMap.size).toBe(2); // template.json and src/index.ts
      expect(capturedFileMap.has('template.json')).toBe(true);
      expect(capturedFileMap.has('src/index.ts')).toBe(true);
    });

    it('should throw error for invalid template.json', async () => {
      const fileMap = new Map<string, Buffer>([
        ['webpart/template.json', Buffer.from('invalid json {')]
      ]);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      await expect(
        source['_createTemplateFromFileMap']('webpart', fileMap)
      ).rejects.toThrow(/Failed to parse template.json/);
    });
  });

  describe('getTemplates', () => {
    it('should fetch and extract templates from GitHub', async () => {
      const mockTemplate = { name: 'Template' } as SPFxTemplate;

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

      (AdmZip as jest.MockedClass<typeof AdmZip>).mockImplementation(() => ({
        getEntries: jest.fn().mockReturnValue(mockEntries)
      } as unknown as AdmZip));

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
      } as unknown as Response);

      mockFromMemoryAsync.mockResolvedValue(mockTemplate);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');
      const templates = await source.getTemplates();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://codeload.github.com/owner/repo/zip/main'
      );
      expect(templates).toHaveLength(1);
    });

    it('should throw error when download fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as unknown as Response);

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      await expect(source.getTemplates()).rejects.toThrow(
        /Failed to fetch templates from GitHub repository/
      );
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const source = new PublicGitHubRepositorySource('https://github.com/owner/repo');

      await expect(source.getTemplates()).rejects.toThrow(
        /Failed to fetch templates from GitHub repository/
      );
    });
  });
});
