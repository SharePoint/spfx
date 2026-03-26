// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { createCasedString, type ICasedString } from '../CasedString';

describe('createCasedString', () => {
  describe('multi-word input "Hello World"', () => {
    const cs: ICasedString = createCasedString('Hello World');

    it('should return the raw value via toString()', () => {
      expect(cs.toString()).toBe('Hello World');
    });

    it('should return the raw value via String() coercion', () => {
      expect(String(cs)).toBe('Hello World');
    });

    it('should return camelCase', () => {
      expect(cs.camel).toBe('helloWorld');
    });

    it('should return PascalCase', () => {
      expect(cs.pascal).toBe('HelloWorld');
    });

    it('should return hyphen-case', () => {
      expect(cs.hyphen).toBe('hello-world');
    });

    it('should return UPPER_SNAKE_CASE', () => {
      expect(cs.allCaps).toBe('HELLO_WORLD');
    });
  });

  describe('single-word input "Minimal"', () => {
    const cs: ICasedString = createCasedString('Minimal');

    it('should return the raw value via toString()', () => {
      expect(cs.toString()).toBe('Minimal');
    });

    it('should return camelCase', () => {
      expect(cs.camel).toBe('minimal');
    });

    it('should return PascalCase', () => {
      expect(cs.pascal).toBe('Minimal');
    });

    it('should return hyphen-case', () => {
      expect(cs.hyphen).toBe('minimal');
    });

    it('should return UPPER_SNAKE_CASE', () => {
      expect(cs.allCaps).toBe('MINIMAL');
    });
  });

  describe('hyphen-case input "my-web-part"', () => {
    const cs: ICasedString = createCasedString('my-web-part');

    it('should return the raw value via toString()', () => {
      expect(cs.toString()).toBe('my-web-part');
    });

    it('should return camelCase', () => {
      expect(cs.camel).toBe('myWebPart');
    });

    it('should return PascalCase', () => {
      expect(cs.pascal).toBe('MyWebPart');
    });

    it('should return hyphen-case', () => {
      expect(cs.hyphen).toBe('my-web-part');
    });

    it('should return UPPER_SNAKE_CASE', () => {
      expect(cs.allCaps).toBe('MY_WEB_PART');
    });
  });

  describe('PascalCase input "DataVisualization"', () => {
    const cs: ICasedString = createCasedString('DataVisualization');

    it('should return the raw value via toString()', () => {
      expect(cs.toString()).toBe('DataVisualization');
    });

    it('should return camelCase', () => {
      expect(cs.camel).toBe('dataVisualization');
    });

    it('should return PascalCase', () => {
      expect(cs.pascal).toBe('DataVisualization');
    });

    it('should return hyphen-case', () => {
      expect(cs.hyphen).toBe('data-visualization');
    });

    it('should return UPPER_SNAKE_CASE', () => {
      expect(cs.allCaps).toBe('DATA_VISUALIZATION');
    });
  });

  describe('EJS template interpolation', () => {
    it('should render raw value when used in template literal', () => {
      const cs: ICasedString = createCasedString('Hello World');
      expect(`Name: ${cs}`).toBe('Name: Hello World');
    });
  });
});
