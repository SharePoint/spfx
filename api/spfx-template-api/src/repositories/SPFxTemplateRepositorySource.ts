
import { SPFxTemplate } from '../templating/SPFxTemplate';

import { LocalFileSystemRepositorySource } from './LocalFileSystemRepositorySource';
import { PublicGitHubRepositorySource } from './PublicGitHubRepositorySource';

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
 * Represents a SharePoint Framework (SPFx) template repository source.
 */
export type SPFxRepositorySource = LocalFileSystemRepositorySource | PublicGitHubRepositorySource;