
import { FileSystem } from '@rushstack/node-core-library';
import { SPFxTemplate } from "../templating/SPFxTemplate";
import AdmZip from 'adm-zip';

/**
 * @public
 * The type of SPFx template repository sources.
 */
export type SPFxTemplateRepositorySourceTypes = 'local' | 'github';

/**
 * @public
 * Base class for SPFx template repository sources.
 */
export abstract class BaseSPFxTemplateRepositorySource {
    public readonly type: SPFxTemplateRepositorySourceTypes;

    public constructor(type: SPFxTemplateRepositorySourceTypes) {
        this.type = type;
    }

    /**
     * Retrieves all templates from this repository source.
     * @returns A Promise that resolves to an array of SPFxTemplate instances
     */
    public abstract getTemplates(): Promise<Array<SPFxTemplate>>;
}

/**
 * @public
 * A repository that already exists on disk.
 */
export class LocalFileSystemRepositorySource extends BaseSPFxTemplateRepositorySource {
    /** The file path of the repository */
    public readonly path: string;

    public constructor(path: string) {
        super('local');
        this.path = path;
    }

    /**
     * Retrieves all templates from the local file system.
     * @returns A Promise that resolves to an array of SPFxTemplate instances
     */
    public async getTemplates(): Promise<Array<SPFxTemplate>> {
        try {
            return await Promise.all(await FileSystem
                .readFolderItems(this.path, {
                    absolutePaths: true // get the full paths back so we don't have to reconstruct it
                })
                .filter(item => item.isDirectory())
                .map(async item => await SPFxTemplate.fromFolderAsync(item.name))
            );
        } catch (error) {
            throw new Error(`Failed to read templates from ${this.path}: ${error}`);
        }
    }
}

/**
 * @public
 * A repository that is hosted on a public GitHub repository.
 */
export class PublicGitHubRepositorySource extends BaseSPFxTemplateRepositorySource {
    private readonly _repoUri: string;
    private readonly _ref: string;

    /**
     * Creates a new instance of PublicGitHubRepositorySource.
     * @param repoUri - The GitHub repository URI (e.g., https://github.com/owner/repo)
     * @param branch - The optional branch name to fetch from (defaults to 'main')
     */
    public constructor(repoUri: string, branch?: string) {
        super('github');
        this._repoUri = repoUri;
        this._ref = branch || 'main';
    }

    /**
     * Retrieves all templates from the GitHub repository.
     * @returns A Promise that resolves to an array of SPFxTemplate instances
     */
    public async getTemplates(): Promise<Array<SPFxTemplate>> {
        try {
            const downloadUrl = this._buildDownloadUrl();
            const fileMap = await this._downloadAndExtractRepository(downloadUrl);
            return await this._parseTemplatesFromFileMap(fileMap);
        } catch (error) {
            throw new Error(`Failed to fetch templates from GitHub repository ${this._repoUri}: ${error}`);
        }
    }

    private _buildDownloadUrl(): string {
        const { owner, repo } = this._parseGitHubUrl();
        return `https://codeload.github.com/${owner}/${repo}/zip/${this._ref}`;
    }

    private _parseGitHubUrl(): { owner: string; repo: string } {
        // Parse URLs like: https://github.com/sharepoint/spfx
        const match = this._repoUri.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
        if (!match) {
            throw new Error(`Invalid GitHub repository URL: ${this._repoUri}`);
        }
        return { owner: match[1], repo: match[2] };
    }

    private async _downloadAndExtractRepository(downloadUrl: string): Promise<Map<string, Buffer>> {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download repository: ${response.status} ${response.statusText}`);
        }

        const zipBuffer = Buffer.from(await response.arrayBuffer());
        return this._extractZipBuffer(zipBuffer);
    }

    private _extractZipBuffer(zipBuffer: Buffer): Map<string, Buffer> {
        const fileMap = new Map<string, Buffer>();
        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();

        for (const entry of entries) {
            // Skip directories
            if (entry.isDirectory) {
                continue;
            }

            const fullPath = entry.entryName;
            
            // Remove the root directory from the path (GitHub adds repo-branch/ prefix)
            const pathParts = fullPath.split('/');
            if (pathParts.length > 1) {
                const relativePath = pathParts.slice(1).join('/');
                const content = entry.getData();
                fileMap.set(relativePath, content);
            }
        }

        return fileMap;
    }

    private async _parseTemplatesFromFileMap(fileMap: Map<string, Buffer>): Promise<Array<SPFxTemplate>> {
        const templates: Array<SPFxTemplate> = [];
        const templateDirs = new Set<string>();

        // Find all directories that contain template.json
        for (const [filePath] of fileMap) {
            if (filePath.endsWith('/template.json') || filePath === 'template.json') {
                const dirPath = filePath === 'template.json' ? '' : filePath.replace('/template.json', '');
                templateDirs.add(dirPath);
            }
        }

        // Create SPFxTemplate instances for each template directory
        for (const templateDir of templateDirs) {
            try {
                const template = await this._createTemplateFromFileMap(templateDir, fileMap);
                if (template) {
                    templates.push(template);
                }
            } catch (error) {
                console.warn(`Failed to parse template from directory ${templateDir}: ${error}`);
            }
        }

        return templates;
    }

    private async _createTemplateFromFileMap(templateDir: string, fileMap: Map<string, Buffer>): Promise<SPFxTemplate | null> {
        // Get template.json content
        const templateJsonPath = templateDir ? `${templateDir}/template.json` : 'template.json';
        const templateJsonBuffer = fileMap.get(templateJsonPath);
        
        if (!templateJsonBuffer) {
            return null;
        }

        try {
            const templateJson = JSON.parse(templateJsonBuffer.toString('utf8'));
            
            // Create a virtual file system for this template
            const templateFiles = new Map<string, Buffer>();
            const prefix = templateDir ? `${templateDir}/` : '';
            
            for (const [filePath, content] of fileMap) {
                if (filePath.startsWith(prefix)) {
                    const relativePath = filePath.substring(prefix.length);
                    templateFiles.set(relativePath, content);
                }
            }

            // Use SPFxTemplate.fromMemoryAsync method
            return await SPFxTemplate.fromMemoryAsync(templateDir || 'root', templateJson, templateFiles);
        } catch (error) {
            throw new Error(`Failed to parse template.json in ${templateDir}: ${error}`);
        }
    }
}

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template repository source.
 */
export type SPFxRepositorySource = LocalFileSystemRepositorySource | PublicGitHubRepositorySource;