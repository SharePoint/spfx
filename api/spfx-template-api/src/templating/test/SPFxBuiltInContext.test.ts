// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import {
  buildBuiltInContext,
  BUILT_IN_PARAMETER_NAMES,
  type ISPFxBuiltInContextInputs,
  type ISPFxBuiltInContext
} from '../SPFxBuiltInContext';

const UUID_REGEX: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const DEFAULT_INPUTS: ISPFxBuiltInContextInputs = {
  componentName: 'Hello World',
  libraryName: '@contoso/hello-world',
  spfxVersion: '1.22.2'
};

describe(buildBuiltInContext.name, () => {
  describe('solution_name derivation', () => {
    it('should derive kebab-case from componentName when solutionName is not provided', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.solution_name).toBe('hello-world');
    });

    it('should use provided solutionName when specified', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        solutionName: 'my-custom-solution'
      });
      expect(ctx.solution_name).toBe('my-custom-solution');
    });

    it('should handle camelCase input', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        componentName: 'myWebPart'
      });
      expect(ctx.solution_name).toBe('my-web-part');
    });

    it('should handle single-word input', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        componentName: 'Widget'
      });
      expect(ctx.solution_name).toBe('widget');
    });
  });

  describe('default values', () => {
    it('should default componentAlias to componentName', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.componentAlias).toBe('Hello World');
    });

    it('should use provided componentAlias when specified', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        componentAlias: 'CustomAlias'
      });
      expect(ctx.componentAlias).toBe('CustomAlias');
    });

    it('should default componentDescription to "{componentName} description"', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.componentDescription).toBe('Hello World description');
    });

    it('should use provided componentDescription when specified', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        componentDescription: 'My custom description'
      });
      expect(ctx.componentDescription).toBe('My custom description');
    });
  });

  describe('pass-through values', () => {
    it('should pass through libraryName unchanged', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.libraryName).toBe('@contoso/hello-world');
    });

    it('should pass through spfxVersion unchanged', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.spfxVersion).toBe('1.22.2');
    });

    it('should pass through componentName unchanged', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.componentName).toBe('Hello World');
    });
  });

  describe('spfxVersionForBadgeUrl', () => {
    it('should escape hyphens as double-hyphens for stable versions', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.spfxVersionForBadgeUrl).toBe('1.22.2');
    });

    it('should escape hyphens for pre-release versions', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...DEFAULT_INPUTS,
        spfxVersion: '1.23.0-beta.0'
      });
      expect(ctx.spfxVersionForBadgeUrl).toBe('1.23.0--beta.0');
    });
  });

  describe('UUID generation (non-CI)', () => {
    it('should generate valid UUID v4 for componentId', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.componentId).toMatch(UUID_REGEX);
    });

    it('should generate valid UUID v4 for solutionId', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.solutionId).toMatch(UUID_REGEX);
    });

    it('should generate valid UUID v4 for featureId', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx.featureId).toMatch(UUID_REGEX);
    });

    it('should generate unique UUIDs across calls', () => {
      const ctx1: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      const ctx2: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      expect(ctx1.componentId).not.toBe(ctx2.componentId);
    });
  });

  describe('CI mode', () => {
    it('should produce deterministic componentId based on alias', () => {
      const ctx1: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      const ctx2: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      expect(ctx1.componentId).toBe(ctx2.componentId);
    });

    it('should produce deterministic featureId based on alias', () => {
      const ctx1: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      const ctx2: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      expect(ctx1.featureId).toBe(ctx2.featureId);
    });

    it('should use fixed solutionId', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      expect(ctx.solutionId).toBe('22222222-2222-2222-2222-222222222222');
    });

    it('should produce different IDs for different component aliases', () => {
      const ctx1: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS, { ciMode: true });
      const ctx2: ISPFxBuiltInContext = buildBuiltInContext(
        { ...DEFAULT_INPUTS, componentAlias: 'Other Component' },
        { ciMode: true }
      );
      expect(ctx1.componentId).not.toBe(ctx2.componentId);
      expect(ctx1.featureId).not.toBe(ctx2.featureId);
    });
  });

  describe('BUILT_IN_PARAMETER_NAMES', () => {
    it('should contain all keys from the built-in context', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(DEFAULT_INPUTS);
      for (const key of Object.keys(ctx)) {
        expect(BUILT_IN_PARAMETER_NAMES.has(key)).toBe(true);
      }
    });

    it('should have the expected size', () => {
      expect(BUILT_IN_PARAMETER_NAMES.size).toBe(10);
    });
  });
});
