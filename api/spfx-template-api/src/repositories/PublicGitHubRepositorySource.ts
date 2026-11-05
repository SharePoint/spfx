// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import AdmZip from 'adm-zip';

import type { ITerminal } from '@rushstack/terminal';

import { SPFxTemplate } from '../templating/SPFxTemplate';
import { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';

/**
 * @internal
 */
export async function _parseTemplatesFromFileMapAsync(
  terminal: ITerminal,
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

  // Collect unknown field names across all templates and warn once
  const allUnknownFields: Set<string> = new Set<string>();
  for (const template of templates) {
    for (const field of template.unknownFields) {
      allUnknownFields.add(field);
    }
  }
  if (allUnknownFields.size > 0) {
    terminal.writeWarningLine(
      `Template(s) contain unrecognized fields: ${[...allUnknownFields].sort().join(', ')}. ` +
        `You may need to update your CLI to the latest version.`
    );
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
 * Options for constructing a {@link PublicGitHubRepositorySource}.
 */
export interface IPublicGitHubRepositorySourceOptions {
  /**
   * The GitHub repository URL (e.g., https://github.com/owner/repo or
   * https://github.mycompany.com/org/repo for GitHub Enterprise).
   */
  repoUrl: string;

  /**
   * The branch name to fetch from. Defaults to 'version/latest' if not specified.
   */
  branch?: string;

  /**
   * The Terminal instance for logging.
   */
  terminal: ITerminal;

  /**
   * An optional GitHub personal access token for authenticating requests.
   * Required for most GitHub Enterprise instances and for private repositories
   * on github.com. When provided, it is sent as an `Authorization: token <value>` header.
   */
  token?: string;
}

// Matches https://<host>/<owner>/<repo>[.git] — HTTPS only, host-agnostic for GHE support.
const REPO_URL_REGEX: RegExp = /^https:\/\/([^/]+)\/([^/]+)\/([^/]+?)(\.git)?$/;

/**
 * @public
 * A template source backed by a GitHub repository (github.com or GitHub Enterprise).
 *
 * For `github.com` hosts the archive is fetched from `codeload.github.com`.
 * For GitHub Enterprise (GHE) hosts the archive is fetched via the GHE REST API
 * (`https://<host>/api/v3/repos/<owner>/<repo>/zipball/<ref>`).
 *
 * An optional personal access token can be supplied via
 * {@link IPublicGitHubRepositorySourceOptions.token} for GHE instances or
 * private repositories on github.com.
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
 * - Users can override with --local-source for full control
 *
 * This pattern is similar to other scaffolding tools (npm create, dotnet new, etc.)
 */
export class PublicGitHubRepositorySource extends BaseSPFxTemplateRepositorySource {
  private readonly _repoUrl: string;
  private readonly _ref: string;
  private readonly _terminal: ITerminal;
  private readonly _token: string | undefined;

  public constructor(options: IPublicGitHubRepositorySourceOptions) {
    super('github');
    const { repoUrl, branch, terminal, token } = options;
    this._repoUrl = repoUrl;
    this._ref = branch || 'version/latest';
    this._terminal = terminal;
    this._token = token;
  }

  /**
   * Retrieves all templates from the GitHub repository.
   * @returns A Promise that resolves to an array of SPFxTemplate instances
   */
  public override async getTemplatesAsync(): Promise<Array<SPFxTemplate>> {
    try {
      const downloadUrl: string = this._buildDownloadUrl();
      const fileMap: Map<string, Buffer> = await this._downloadAndExtractRepositoryAsync(downloadUrl);
      return await _parseTemplatesFromFileMapAsync(this._terminal, fileMap);
    } catch (error) {
      throw new Error(`Failed to fetch templates from GitHub repository ${this._repoUrl}: ${error}`);
    }
  }

  private _buildDownloadUrl(): string {
    const { host, owner, repo } = this._parseRepoUrl();
    if (host === 'github.com') {
      return `https://codeload.github.com/${owner}/${repo}/zip/${this._ref}`;
    }
    // GitHub Enterprise: use the REST API archive endpoint
    return `https://${host}/api/v3/repos/${owner}/${repo}/zipball/${this._ref}`;
  }

  private _parseRepoUrl(): { host: string; owner: string; repo: string } {
    // Parse URLs like: https://github.com/owner/repo, https://github.mycompany.com/org/repo,
    // or the same with a .git suffix. Only HTTPS is accepted.
    const match: RegExpMatchArray | null = this._repoUrl.match(REPO_URL_REGEX);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${this._repoUrl}`);
    }

    const [, host, owner, repo] = match as [string, string, string, string, string?];
    return { host: host.toLowerCase(), owner, repo };
  }

  private async _downloadAndExtractRepositoryAsync(downloadUrl: string): Promise<Map<string, Buffer>> {
    const fetchInit: RequestInit = {};
    if (this._token) {
      fetchInit.headers = { Authorization: `token ${this._token}` };
    }
    const response: Response = await fetch(downloadUrl, fetchInit);
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
