import { SPFxTemplate } from "../templating";

/**
 * @public
 * Represents a collection of SharePoint Framework (SPFx) templates.
 * These are a map from template name to template instance.
 */
export class SPFxTemplateCollection implements ReadonlyMap<string, SPFxTemplate> {
    private readonly _map: Map<string, SPFxTemplate>;

    public constructor(templates: SPFxTemplate[]) {
        this._map = new Map(templates.map(template => [template.name, template]));
    }

    public get size(): number {
        return this._map.size;
    }

    public has(key: string): boolean {
        return this._map.has(key);
    }

    public get(key: string): SPFxTemplate | undefined {
        return this._map.get(key);
    }

    public entries(): MapIterator<[string, SPFxTemplate]> {
        return this._map.entries() as MapIterator<[string, SPFxTemplate]>;
    }

    public keys(): MapIterator<string> {
        return this._map.keys() as MapIterator<string>;
    }

    public values(): MapIterator<SPFxTemplate> {
        return this._map.values() as MapIterator<SPFxTemplate>;
    }

    public forEach(callback: (value: SPFxTemplate, key: string, map: ReadonlyMap<string, SPFxTemplate>) => void): void {
        this._map.forEach(callback);
    }

    public [Symbol.iterator](): MapIterator<[string, SPFxTemplate]> {
        return this._map[Symbol.iterator]() as MapIterator<[string, SPFxTemplate]>;
    }

    public toString(): string {
        return [
            `# of templates: ${this.size}`,
            ...Array.from(this._map.values()).map(template => template.toString() + '\n')
        ].join("\n");
    }
}