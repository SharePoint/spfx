// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import {
  buildBuiltInContext,
  BUILT_IN_PARAMETER_NAMES,
  type ISPFxBuiltInContext
} from '../SPFxBuiltInContext';

describe('buildBuiltInContext', () => {
  const baseInputs = {
    componentName: 'Hello World',
    libraryName: '@contoso/hello-world',
    spfxVersion: '1.22.2'
  };

  describe('name derivation', () => {
    it('should compute camelCase correctly', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentNameCamelCase).toBe('helloWorld');
    });

    it('should compute kebab-case correctly', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentNameHyphenCase).toBe('hello-world');
    });

    it('should compute CapitalCase correctly', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentNameCapitalCase).toBe('HelloWorld');
    });

    it('should compute ALL_CAPS correctly', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentNameAllCaps).toBe('HELLO_WORLD');
    });

    it('should handle single word names', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...baseInputs,
        componentName: 'Minimal'
      });
      expect(ctx.componentNameCamelCase).toBe('minimal');
      expect(ctx.componentNameHyphenCase).toBe('minimal');
      expect(ctx.componentNameCapitalCase).toBe('Minimal');
      expect(ctx.componentNameAllCaps).toBe('MINIMAL');
    });

    it('should handle camelCase input', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...baseInputs,
        componentName: 'helloWorld'
      });
      expect(ctx.componentNameCamelCase).toBe('helloWorld');
      expect(ctx.componentNameHyphenCase).toBe('hello-world');
      expect(ctx.componentNameCapitalCase).toBe('HelloWorld');
      expect(ctx.componentNameAllCaps).toBe('HELLO_WORLD');
    });
  });

  describe('default values', () => {
    it('should default componentAlias to componentName', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentAlias).toBe('Hello World');
    });

    it('should default componentDescription', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentDescription).toBe('Hello World description');
    });

    it('should default solution_name to kebab-case component name', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.solution_name).toBe('hello-world');
    });

    it('should use provided componentAlias', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...baseInputs,
        componentAlias: 'MyAlias'
      });
      expect(ctx.componentAlias).toBe('MyAlias');
    });

    it('should use provided componentDescription', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...baseInputs,
        componentDescription: 'Custom desc'
      });
      expect(ctx.componentDescription).toBe('Custom desc');
    });

    it('should use provided solutionName', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext({
        ...baseInputs,
        solutionName: 'my-custom-solution'
      });
      expect(ctx.solution_name).toBe('my-custom-solution');
    });
  });

  describe('CI mode', () => {
    it('should use deterministic IDs in CI mode', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs, { ciMode: true });
      expect(ctx.componentId).toBe('11111111-1111-1111-1111-111111111111');
      expect(ctx.solutionId).toBe('22222222-2222-2222-2222-222222222222');
      expect(ctx.featureId).toBe('33333333-3333-3333-3333-333333333333');
    });

    it('should generate random UUIDs when not in CI mode', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentId).not.toBe('11111111-1111-1111-1111-111111111111');
      expect(ctx.componentId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('pass-through values', () => {
    it('should pass through libraryName and spfxVersion', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.libraryName).toBe('@contoso/hello-world');
      expect(ctx.spfxVersion).toBe('1.22.2');
    });

    it('should set eslintProfile to react', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.eslintProfile).toBe('react');
    });

    it('should set componentNameUnescaped to raw component name', () => {
      const ctx: ISPFxBuiltInContext = buildBuiltInContext(baseInputs);
      expect(ctx.componentNameUnescaped).toBe('Hello World');
    });
  });
});

describe('BUILT_IN_PARAMETER_NAMES', () => {
  it('should contain expected built-in names', () => {
    expect(BUILT_IN_PARAMETER_NAMES.has('componentId')).toBe(true);
    expect(BUILT_IN_PARAMETER_NAMES.has('solutionId')).toBe(true);
    expect(BUILT_IN_PARAMETER_NAMES.has('featureId')).toBe(true);
    expect(BUILT_IN_PARAMETER_NAMES.has('componentNameCamelCase')).toBe(true);
    expect(BUILT_IN_PARAMETER_NAMES.has('solution_name')).toBe(true);
    expect(BUILT_IN_PARAMETER_NAMES.has('spfxVersion')).toBe(true);
  });

  it('should not contain arbitrary names', () => {
    expect(BUILT_IN_PARAMETER_NAMES.has('customParam')).toBe(false);
  });
});
