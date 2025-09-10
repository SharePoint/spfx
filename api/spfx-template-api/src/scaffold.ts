import * as z from 'zod';
import { ConsoleTerminalProvider, Terminal } from '@rushstack/terminal';

import {
    LocalFileSystemRepositorySource,
    SPFxTemplateCollection,
    SPFxTemplateRepositoryManager
} from './repositories';
import { SPFxTemplate } from './templating';

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
        templateName
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

    template.render({});
};