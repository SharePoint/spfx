
import { FileSystem } from '@rushstack/node-core-library';

import { SPFxTemplate } from '../templating/SPFxTemplate';
import { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';

/**
 * @public
 * A repository that already exists on disk.
 */
export class LocalFileSystemRepositorySource extends BaseSPFxTemplateRepositorySource {
    private readonly _path: string;

    /**
     * Creates a new instance of LocalFileSystemRepositorySource.
     * @param path - The file system path to the repository
     */
    public constructor(path: string) {
        super('local');
        this._path = path;
    }

    /** The file path of the repository */
    public get path(): string {
        return this._path;
    }

    /**
     * Retrieves all templates from the local file system.
     * @returns A Promise that resolves to an array of SPFxTemplate instances
     */
    public async getTemplates(): Promise<Array<SPFxTemplate>> {
        try {
            const items = await FileSystem
                .readFolderItems(this.path, {
                    absolutePaths: true // get the full paths back so we don't have to reconstruct it
                })
                .filter(item => {
                    // Only include directories that don't start with a dot (e.g., .rush, .git)
                    const basename = item.name.split(/[/\\]/).pop() || '';
                    return item.isDirectory() && !basename.startsWith('.');
                });

            // Filter for directories that contain template.json
            const templateDirs = await Promise.all(
                items.map(async item => {
                    const templateJsonPath = `${item.name}/template.json`;
                    const exists = await FileSystem.existsAsync(templateJsonPath);
                    return exists ? item.name : null;
                })
            );

            // Load templates from valid directories
            return await Promise.all(
                templateDirs
                    .filter((path): path is string => path !== null)
                    .map(async path => await SPFxTemplate.fromFolderAsync(path))
            );
        } catch (error) {
            throw new Error(`Failed to read templates from ${this.path}: ${error}`);
        }
    }
}