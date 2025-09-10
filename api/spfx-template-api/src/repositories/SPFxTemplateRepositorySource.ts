
import { FileSystem } from '@rushstack/node-core-library';
import { SPFxTemplate } from "../templating/SPFxTemplate";

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
    private readonly _branch?: string;

    public constructor(repoUri: string, branch?: string) {
        super('github');
        this._repoUri = repoUri;
        this._branch = branch;
    }

    public async getTemplates(): Promise<Array<SPFxTemplate>> {
        // Implement logic to fetch templates from the GitHub repository
        return [];
    }
}

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template repository source.
 */
export type SPFxRepositorySource = LocalFileSystemRepositorySource | PublicGitHubRepositorySource;