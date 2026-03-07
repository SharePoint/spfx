// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as crypto from 'node:crypto';

const CI_COMPONENT_ID: string = '11111111-1111-1111-1111-111111111111';
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';
const CI_FEATURE_ID: string = '33333333-3333-3333-3333-333333333333';

/**
 * Raw inputs from the CLI used to derive the full built-in context.
 * @public
 */
export interface ISPFxBuiltInContextInputs {
  /** The human-readable component name (e.g. "Hello World") */
  componentName: string;
  /** The library/package name (e.g. "\@contoso/my-webpart") */
  libraryName: string;
  /** The SPFx version from the template */
  spfxVersion: string;
  /** Optional solution name override; defaults to kebab-case component name */
  solutionName?: string;
  /** Optional component alias; defaults to componentName */
  componentAlias?: string;
  /** Optional component description; defaults to "componentName description" */
  componentDescription?: string;
}

/**
 * The full set of built-in context variables injected into every template.
 * @public
 */
export interface ISPFxBuiltInContext {
  solution_name: string;
  eslintProfile: string;
  libraryName: string;
  spfxVersion: string;
  componentId: string;
  featureId: string;
  solutionId: string;
  componentAlias: string;
  componentNameUnescaped: string;
  componentNameCamelCase: string;
  componentNameHyphenCase: string;
  componentNameCapitalCase: string;
  componentNameAllCaps: string;
  componentDescription: string;
}

/**
 * The set of all built-in parameter names. Template custom parameters must not collide with these.
 * @public
 */
export const BUILT_IN_PARAMETER_NAMES: ReadonlySet<string> = new Set<string>([
  'solution_name',
  'eslintProfile',
  'libraryName',
  'spfxVersion',
  'componentId',
  'featureId',
  'solutionId',
  'componentAlias',
  'componentNameUnescaped',
  'componentNameCamelCase',
  'componentNameHyphenCase',
  'componentNameCapitalCase',
  'componentNameAllCaps',
  'componentDescription'
]);

/**
 * Options for building built-in context.
 * @public
 */
export interface IBuildBuiltInContextOptions {
  /** When true, uses deterministic UUIDs instead of random ones. */
  ciMode?: boolean;
}

// Converts a string to camelCase.
// "Hello World" -> "helloWorld", "foo-bar" -> "fooBar"
function toCamelCase(str: string): string {
  const words: string[] = splitWords(str);
  if (words.length === 0) return '';
  const first: string = words[0]!;
  return first.toLowerCase() + words.slice(1).map(capitalize).join('');
}

// Converts a string to kebab-case.
function toKebabCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toLowerCase())
    .join('-');
}

// Converts a string to UPPER_SNAKE_CASE.
function toUpperSnakeCase(str: string): string {
  return splitWords(str)
    .map((w) => w.toUpperCase())
    .join('_');
}

// Capitalizes the first letter of a string.
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Splits a string into words, handling camelCase, kebab-case, snake_case, and spaces.
function splitWords(str: string): string[] {
  // Insert boundary before uppercase letters in camelCase: "fooBar" -> "foo Bar"
  const spaced: string = str.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  // Split on non-alphanumeric characters
  return spaced.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 0);
}

/**
 * Builds the full set of built-in context variables from raw CLI inputs.
 * @public
 */
export function buildBuiltInContext(
  inputs: ISPFxBuiltInContextInputs,
  options?: IBuildBuiltInContextOptions
): ISPFxBuiltInContext {
  const ciMode: boolean = options?.ciMode ?? false;

  const componentId: string = ciMode ? CI_COMPONENT_ID : crypto.randomUUID();
  const solutionId: string = ciMode ? CI_SOLUTION_ID : crypto.randomUUID();
  const featureId: string = ciMode ? CI_FEATURE_ID : crypto.randomUUID();

  const componentName: string = inputs.componentName;
  const componentNameCamelCase: string = toCamelCase(componentName);
  const componentNameHyphenCase: string = toKebabCase(componentName);
  const componentNameCapitalCase: string =
    componentNameCamelCase.charAt(0).toUpperCase() + componentNameCamelCase.slice(1);
  const componentNameAllCaps: string = toUpperSnakeCase(componentName);

  const componentAlias: string = inputs.componentAlias ?? componentName;
  const componentDescription: string = inputs.componentDescription ?? `${componentName} description`;
  const solutionName: string = inputs.solutionName ?? componentNameHyphenCase;

  return {
    solution_name: solutionName,
    eslintProfile: 'react',
    libraryName: inputs.libraryName,
    spfxVersion: inputs.spfxVersion,
    componentId,
    featureId,
    solutionId,
    componentAlias,
    componentNameUnescaped: componentName,
    componentNameCamelCase,
    componentNameHyphenCase,
    componentNameCapitalCase,
    componentNameAllCaps,
    componentDescription
  };
}
