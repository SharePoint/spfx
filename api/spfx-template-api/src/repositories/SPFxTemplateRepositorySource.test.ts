import { BaseSPFxTemplateRepositorySource, SPFxTemplateRepositorySourceTypes } from './SPFxTemplateRepositorySource';
import { SPFxTemplate } from '../templating/SPFxTemplate';

// Create a concrete implementation for testing
class TestRepositorySource extends BaseSPFxTemplateRepositorySource {
  private _templates: SPFxTemplate[];

  public constructor(type: SPFxTemplateRepositorySourceTypes, templates: SPFxTemplate[] = []) {
    super(type);
    this._templates = templates;
  }

  public async getTemplates(): Promise<Array<SPFxTemplate>> {
    return this._templates;
  }
}

describe('BaseSPFxTemplateRepositorySource', () => {
  describe('constructor', () => {
    it('should create an instance with local type', () => {
      const source = new TestRepositorySource('local');

      expect(source.type).toBe('local');
    });

    it('should create an instance with github type', () => {
      const source = new TestRepositorySource('github');

      expect(source.type).toBe('github');
    });
  });

  describe('type property', () => {
    it('should be readonly and not changeable', () => {
      const source = new TestRepositorySource('local');

      expect(() => {
        // @ts-expect-error - Testing readonly property
        source.type = 'github';
      }).toThrow();
    });

    it('should return the correct type value', () => {
      const localSource = new TestRepositorySource('local');
      const githubSource = new TestRepositorySource('github');

      expect(localSource.type).toBe('local');
      expect(githubSource.type).toBe('github');
    });
  });

  describe('getTemplates abstract method', () => {
    it('should be implemented by concrete class', async () => {
      const source = new TestRepositorySource('local');

      expect(source.getTemplates).toBeDefined();
      expect(typeof source.getTemplates).toBe('function');
    });

    it('should return a promise', () => {
      const source = new TestRepositorySource('local');
      const result = source.getTemplates();

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to an array', async () => {
      const source = new TestRepositorySource('local');
      const result = await source.getTemplates();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
