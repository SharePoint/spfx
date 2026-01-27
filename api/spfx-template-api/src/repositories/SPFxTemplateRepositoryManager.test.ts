import { SPFxTemplateRepositoryManager } from './SPFxTemplateRepositoryManager';
import { BaseSPFxTemplateRepositorySource } from './SPFxTemplateRepositorySource';
import { SPFxTemplate } from '../templating/SPFxTemplate';
import { SPFxTemplateJsonFile } from '../templating/SPFxTemplateJsonFile';
import { SPFxTemplateCollection } from './SPFxTemplateCollection';

// Create a mock repository source for testing
class MockRepositorySource extends BaseSPFxTemplateRepositorySource {
  private _templates: SPFxTemplate[];

  public constructor(type: 'local' | 'github', templates: SPFxTemplate[] = []) {
    super(type);
    this._templates = templates;
  }

  public async getTemplates(): Promise<Array<SPFxTemplate>> {
    return this._templates;
  }
}

describe('SPFxTemplateRepositoryManager', () => {
  describe('constructor', () => {
    it('should create an instance with empty sources', () => {
      const manager = new SPFxTemplateRepositoryManager();

      expect(manager).toBeInstanceOf(SPFxTemplateRepositoryManager);
      expect(manager['_sources']).toEqual([]);
    });
  });

  describe('addSource', () => {
    it('should add a repository source', () => {
      const manager = new SPFxTemplateRepositoryManager();
      const source = new MockRepositorySource('local');

      manager.addSource(source);

      expect(manager['_sources']).toHaveLength(1);
      expect(manager['_sources'][0]).toBe(source);
    });

    it('should add multiple sources', () => {
      const manager = new SPFxTemplateRepositoryManager();
      const source1 = new MockRepositorySource('local');
      const source2 = new MockRepositorySource('github');
      const source3 = new MockRepositorySource('local');

      manager.addSource(source1);
      manager.addSource(source2);
      manager.addSource(source3);

      expect(manager['_sources']).toHaveLength(3);
      expect(manager['_sources'][0]).toBe(source1);
      expect(manager['_sources'][1]).toBe(source2);
      expect(manager['_sources'][2]).toBe(source3);
    });

    it('should maintain order of added sources', () => {
      const manager = new SPFxTemplateRepositoryManager();
      const sources = [
        new MockRepositorySource('local'),
        new MockRepositorySource('github'),
        new MockRepositorySource('local')
      ];

      sources.forEach(source => manager.addSource(source));

      expect(manager['_sources']).toEqual(sources);
    });
  });

  describe('getTemplates', () => {
    it('should return empty collection when no sources added', async () => {
      const manager = new SPFxTemplateRepositoryManager();

      const collection = await manager.getTemplates();

      expect(collection).toBeInstanceOf(SPFxTemplateCollection);
      expect(collection.size).toBe(0);
    });

    it('should return templates from single source', async () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template1',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template2',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const manager = new SPFxTemplateRepositoryManager();
      const source = new MockRepositorySource('local', [template1, template2]);
      manager.addSource(source);

      const collection = await manager.getTemplates();

      expect(collection.size).toBe(2);
      expect(collection.get('Template1')).toBe(template1);
      expect(collection.get('Template2')).toBe(template2);
    });

    it('should combine templates from multiple sources', async () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'LocalTemplate',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'GitHubTemplate',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const manager = new SPFxTemplateRepositoryManager();
      const localSource = new MockRepositorySource('local', [template1]);
      const githubSource = new MockRepositorySource('github', [template2]);

      manager.addSource(localSource);
      manager.addSource(githubSource);

      const collection = await manager.getTemplates();

      expect(collection.size).toBe(2);
      expect(collection.get('LocalTemplate')).toBe(template1);
      expect(collection.get('GitHubTemplate')).toBe(template2);
    });

    it('should flatten templates from all sources', async () => {
      const templates1 = [
        new SPFxTemplate(
          new SPFxTemplateJsonFile({ name: 'T1', version: '1.0.0', spfxVersion: '1.18.0' }),
          new Map()
        ),
        new SPFxTemplate(
          new SPFxTemplateJsonFile({ name: 'T2', version: '1.0.0', spfxVersion: '1.18.0' }),
          new Map()
        )
      ];

      const templates2 = [
        new SPFxTemplate(
          new SPFxTemplateJsonFile({ name: 'T3', version: '1.0.0', spfxVersion: '1.18.0' }),
          new Map()
        )
      ];

      const templates3 = [
        new SPFxTemplate(
          new SPFxTemplateJsonFile({ name: 'T4', version: '1.0.0', spfxVersion: '1.18.0' }),
          new Map()
        ),
        new SPFxTemplate(
          new SPFxTemplateJsonFile({ name: 'T5', version: '1.0.0', spfxVersion: '1.18.0' }),
          new Map()
        )
      ];

      const manager = new SPFxTemplateRepositoryManager();
      manager.addSource(new MockRepositorySource('local', templates1));
      manager.addSource(new MockRepositorySource('github', templates2));
      manager.addSource(new MockRepositorySource('local', templates3));

      const collection = await manager.getTemplates();

      expect(collection.size).toBe(5);
      expect(collection.has('T1')).toBe(true);
      expect(collection.has('T2')).toBe(true);
      expect(collection.has('T3')).toBe(true);
      expect(collection.has('T4')).toBe(true);
      expect(collection.has('T5')).toBe(true);
    });

    it('should handle sources with no templates', async () => {
      const template = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'Template1',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const manager = new SPFxTemplateRepositoryManager();
      manager.addSource(new MockRepositorySource('local', []));
      manager.addSource(new MockRepositorySource('github', [template]));
      manager.addSource(new MockRepositorySource('local', []));

      const collection = await manager.getTemplates();

      expect(collection.size).toBe(1);
      expect(collection.get('Template1')).toBe(template);
    });

    it('should fetch templates from all sources concurrently', async () => {
      const startTimes: number[] = [];

      class TimedMockSource extends BaseSPFxTemplateRepositorySource {
        public constructor() {
          super('local');
        }

        public async getTemplates(): Promise<Array<SPFxTemplate>> {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return [];
        }
      }

      const manager = new SPFxTemplateRepositoryManager();
      manager.addSource(new TimedMockSource());
      manager.addSource(new TimedMockSource());
      manager.addSource(new TimedMockSource());

      await manager.getTemplates();

      // All calls should start at approximately the same time (concurrent)
      expect(startTimes).toHaveLength(3);
      const maxDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxDiff).toBeLessThan(50); // Should all start within 50ms
    });

    it('should propagate errors from sources', async () => {
      class ErrorSource extends BaseSPFxTemplateRepositorySource {
        public constructor() {
          super('local');
        }

        public async getTemplates(): Promise<Array<SPFxTemplate>> {
          throw new Error('Failed to fetch templates');
        }
      }

      const manager = new SPFxTemplateRepositoryManager();
      manager.addSource(new ErrorSource());

      await expect(manager.getTemplates()).rejects.toThrow('Failed to fetch templates');
    });

    it('should handle duplicate template names (last one wins)', async () => {
      const template1 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'DuplicateName',
          version: '1.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const template2 = new SPFxTemplate(
        new SPFxTemplateJsonFile({
          name: 'DuplicateName',
          version: '2.0.0',
          spfxVersion: '1.18.0'
        }),
        new Map()
      );

      const manager = new SPFxTemplateRepositoryManager();
      manager.addSource(new MockRepositorySource('local', [template1]));
      manager.addSource(new MockRepositorySource('github', [template2]));

      const collection = await manager.getTemplates();

      expect(collection.size).toBe(1);
      // The last template with the same name wins
      expect(collection.get('DuplicateName')?.version).toBe('2.0.0');
    });
  });
});
