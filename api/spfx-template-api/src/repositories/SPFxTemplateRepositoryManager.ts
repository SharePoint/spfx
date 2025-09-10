import { SPFxTemplate } from "../templating/SPFxTemplate";
import { BaseSPFxTemplateRepositorySource } from "./SPFxTemplateRepositorySource";
import { SPFxTemplateCollection } from "./SPFxTemplateCollection";

/**
 * @public
 * Primary utility for working with SPFx template repository sources.
 * This class handles configuring multiple repository sources, pulling them locally,
 * and providing them to the rest of the application.
 */
export class SPFxTemplateRepositoryManager {
  private _sources: Array<BaseSPFxTemplateRepositorySource>;

  public constructor() {
    this._sources = [];
  }

  /**
   * Adds a new template repository source.
   */
  public addSource(source: BaseSPFxTemplateRepositorySource): void {
    this._sources.push(source);
  }

  public async getTemplates(): Promise<SPFxTemplateCollection> {
    const templates: Array<Array<SPFxTemplate>> = await Promise.all(this._sources.map(source => source.getTemplates()));
    return new SPFxTemplateCollection(templates.flat());
  }
}