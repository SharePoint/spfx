// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import AdmZip from 'adm-zip';

import { ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

import { SPFxTemplate } from '../templating/SPFxTemplate';
import { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';

/**
 * @internal
 */
export async function _parseTemplatesFromFileMapAsync(
  terminal: Terminal,
  fileMap: Map<string, Buffer>
): Promise<Array<SPFxTemplate>> {
  const templates: Array<SPFxTemplate> = [];
  const templateDirs: Set<string> = new Set<string>();

  // Find all directories that contain template.json
  for (const [filePath] of fileMap) {
    if (filePath.endsWith('/template.json') || filePath === 'template.json') {
      const dirPath: string = filePath === 'template.json' ? '' : filePath.replace('/template.json', '');
      templateDirs.add(dirPath);
    }
  }

  // Create SPFxTemplate instances for each template directory
  for (const templateDir of templateDirs) {
    try {
      const template: SPFxTemplate | undefined = await _createTemplateFromFileMapAsync(templateDir, fileMap);
      if (template) {
        templates.push(template);
      }
    } catch (error) {
      terminal.writeWarningLine(`Failed to parse template from directory ${templateDir}: ${error}`);
    }
  }

  return templates;
}

/**
 * @internal
 */
export async function _createTemplateFromFileMapAsync(
  templateDir: string,
  fileMap: Map<string, Buffer>
): Promise<SPFxTemplate | undefined> {
  // Get template.json content
  const templateJsonPath: string = templateDir ? `${templateDir}/template.json` : 'template.json';
  const templateJsonBuffer: Buffer | undefined = fileMap.get(templateJsonPath);

  if (!templateJsonBuffer) {
    return undefined;
  }

  try {
    const templateJson: unknown = JSON.parse(templateJsonBuffer.toString('utf8'));

    // Create a virtual file system for this template
    const templateFiles: Map<string, Buffer> = new Map<string, Buffer>();
    const prefix: string = templateDir ? `${templateDir}/` : '';

    for (const [filePath, content] of fileMap) {
      if (filePath.startsWith(prefix)) {
        const relativePath: string = filePath.substring(prefix.length);
        templateFiles.set(relativePath, content);
      }
    }

    // Use SPFxTemplate.fromMemoryAsync method
    return await SPFxTemplate.fromMemoryAsync(templateDir || 'root', templateJson, templateFiles);
  } catch (error) {
    throw new Error(`Failed to parse template.json in ${templateDir}: ${error}`);
  }
}

/**
 * @public
 * A repository that is hosted on a public GitHub repository.
 *
 * SECURITY NOTE: This class intentionally fetches from mutable branch references
 * (not pinned commit SHAs) to enable template updates independent of CLI releases.
 * This is a deliberate architectural decision that prioritizes:
 *
 * 1. **Agility**: Template bug fixes can be deployed without CLI updates
 * 2. **User experience**: Users automatically get template improvements
 * 3. **Operational flexibility**: Decouples template lifecycle from CLI lifecycle
 *
 * The security implications are acceptable because:
 * - Templates are scaffolding code (one-time generation), not runtime dependencies
 * - Users trust the source repository (Microsoft-controlled for defaults)
 * - HTTPS provides transport security and authenticity
 * - Users can override with --local-template for full control
 *
 * This pattern is similar to other scaffolding tools (npm create, dotnet new, etc.)
 */
export class PublicGitHubRepositorySource extends BaseSPFxTemplateRepositorySource {
  private readonly _repoUri: string;
  private readonly _ref: string;
  private readonly _terminal: Terminal;

  /**
   * Creates a new instance of PublicGitHubRepositorySource.
   * @param repoUri - The GitHub repository URI (e.g., https://github.com/owner/repo)
   * @param branch - The optional branch name to fetch from (defaults to 'main')
   * @param terminal - The optional Terminal instance for logging (defaults to console terminal)
   */
  public constructor(repoUri: string, branch?: string, terminal?: Terminal) {
    super('github');
    this._repoUri = repoUri;
    this._ref = branch || 'main';
    this._terminal = terminal || new Terminal(new ConsoleTerminalProvider());
  }

  /**
   * Retrieves all templates from the GitHub repository.
   * @returns A Promise that resolves to an array of SPFxTemplate instances
   */
  public async getTemplatesAsync(): Promise<Array<SPFxTemplate>> {
    try {
      const downloadUrl: string = this._buildDownloadUrl();
      const fileMap: Map<string, Buffer> = await this._downloadAndExtractRepositoryAsync(downloadUrl);
      return await _parseTemplatesFromFileMapAsync(this._terminal, fileMap);
    } catch (error) {
      throw new Error(`Failed to fetch templates from GitHub repository ${this._repoUri}: ${error}`);
    }
  }

  private _buildDownloadUrl(): string {
    const { owner, repo } = this._parseGitHubUrl();
    return `https://codeload.github.com/${owner}/${repo}/zip/${this._ref}`;
  }

  private _parseGitHubUrl(): { owner: string; repo: string } {
    // Parse URLs like: https://github.com/sharepoint/spfx or https://github.com/sharepoint/spfx.git
    const match: RegExpMatchArray | null = this._repoUri.match(/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${this._repoUri}`);
    }

    const [, owner, repo] = match as [string, string, string];
    return { owner, repo };
  }

  private async _downloadAndExtractRepositoryAsync(downloadUrl: string): Promise<Map<string, Buffer>> {
    const response: Response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download repository: ${response.status} ${response.statusText}`);
    }

    const zipBuffer: Buffer = Buffer.from(await response.arrayBuffer());
    return this._extractZipBuffer(zipBuffer);
  }

  private _extractZipBuffer(zipBuffer: Buffer): Map<string, Buffer> {
    const fileMap: Map<string, Buffer> = new Map<string, Buffer>();
    const zip: AdmZip = new AdmZip(zipBuffer);
    const entries: AdmZip.IZipEntry[] = zip.getEntries();

    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory) {
        continue;
      }

      const fullPath: string = entry.entryName;

      // Remove the root directory from the path (GitHub adds repo-branch/ prefix)
      const pathParts: string[] = fullPath.split('/');
      if (pathParts.length > 1) {
        const relativePath: string = pathParts.slice(1).join('/');
        const content: Buffer = entry.getData();
        fileMap.set(relativePath, content);
      }
    }

    return fileMap;
  }
}
