
import { FileSystem } from '@rushstack/node-core-library';

import { SPFxTemplate } from '../templating/SPFxTemplate';
import { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';

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