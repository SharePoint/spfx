import * as z from 'zod';
import { Colorize, ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

import {
    LocalFileSystemRepositorySource,
    SPFxTemplateCollection,
    SPFxTemplateRepositoryManager
} from './repositories';
import { SPFxTemplate } from './templating';
import { MemFsEditor } from 'mem-fs-editor';

/**
 * @public
 */
export interface IScaffoldProfile {
    localTemplateSources?: Array<string> | readonly string[];
    templateName: string;
    targetDir: string;
}

/**
 * @public
 */
export const ScaffoldProfileSchema: z.ZodType<IScaffoldProfile> = z.object({
    targetDir: z.string().min(1),
    localTemplateSources: z.array(z.string()).optional().default([]),
    templateName: z.string().min(1)
});


/**
 * @public
 */
export async function scaffold(options: IScaffoldProfile, terminal: Terminal = new Terminal(new ConsoleTerminalProvider())): Promise<void> {
    const validationResult = ScaffoldProfileSchema.safeParse(options);
    if (!validationResult.success) {
        throw new Error(`Invalid scaffold profile: ${JSON.stringify(validationResult.error.issues)}`);
    }

    const {
        localTemplateSources,
        templateName,
        targetDir
    } = {
        localTemplateSources: [],
        ...options
    };

    const manager: SPFxTemplateRepositoryManager = new SPFxTemplateRepositoryManager();

    for (const localPath of localTemplateSources) {
        terminal.writeLine(`Adding local template source: ${localPath}`);
        manager.addSource(new LocalFileSystemRepositorySource(localPath));
    }

    const templates: SPFxTemplateCollection = await manager.getTemplates();

    terminal.writeLine(templates.toString());

    const template: SPFxTemplate | undefined = templates.get(templateName);

    if (!template) {
        throw new Error(`Template not found: ${templateName}. Available: ${Array.from(templates.keys()).join(', ')}`);
    }

    const fs = await template.render({
        solution_name: 'test-solution-name',
        eslintProfile: 'react',
        libraryName: '@spfx-template/webpart-minimal',
        versionBadge: 'https://img.shields.io/badge/version-1.0.0-blue',
        componentId: '413af0cb-0c9f-43db-8f86-ad1accc90481',
        componentAlias: 'MyWebPart',
        componentNameUnescaped: 'My Web Part',
        componentNameCamelCase: 'myWebPart',
        componentNameHypenCase: 'my-web-part',
        componentClassName: 'MyWebPart',
        componentStrings: 'MyWebPartStrings',
        componentDescription: 'My Web Part Description',
    }, targetDir);
    _printFileChanges(terminal, fs, targetDir);
    await template.write(fs);
};

/**
 * Utility function to show the user which files in the in-memory file system are pending changes.
 */
function _printFileChanges(terminal: Terminal, fs: MemFsEditor, targetDir: string): void {
    terminal.writeLine(`targetDir: ${targetDir}`);
    const changed: { [key: string]: { state: 'modified' | 'deleted', isNew: boolean } } = fs.dump('D:\\');

    terminal.writeLine();
    terminal.writeLine(Colorize.cyan('The following files will be modified:'));

    for (const [file, data] of Object.entries(changed)) {
        const { state, isNew } = data;
        terminal.writeLine(JSON.stringify(data));
        if (isNew) {
            terminal.writeLine(Colorize.green(`Added: ${file}`));
            continue;
        }
        switch (state) {
            case 'modified':
                terminal.writeLine(Colorize.yellow(`Modified: ${file}`));
                break;
            case 'deleted':
                terminal.writeLine(Colorize.red(`Deleted: ${file}`));
                break;
            default:
                terminal.writeLine(`Unchanged: ${file}`);
                break;
        }
    }
    terminal.writeLine();
}