// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { randomUUID } from 'node:crypto';

import { v5 as uuidv5 } from 'uuid';

/**
 * Raw CLI inputs used to compute the built-in template context.
 * @public
 */
export interface ISPFxBuiltInContextInputs {
  /** Human-readable component name (e.g. "Hello World") */
  componentName: string;
  /** Package / library name (e.g. "\@contoso/hello-world") */
  libraryName: string;
  /** SPFx version from the template manifest */
  spfxVersion: string;
  /** Optional override for the solution folder name; defaults to kebab-cased componentName */
  solutionName?: string;
  /** Optional alias used in the component manifest; defaults to componentName */
  componentAlias?: string;
  /** Optional description; defaults to "\{componentName\} description" */
  componentDescription?: string;
}

/**
 * The full set of built-in context variables injected into every template render.
 * @public
 */
export interface ISPFxBuiltInContext {
  solution_name: string;
  libraryName: string;
  spfxVersion: string;
  /** SPFx version with hyphens escaped for shields.io badge URLs (e.g. "1.23.0--beta.0") */
  spfxVersionForBadgeUrl: string;
  componentId: string;
  featureId: string;
  solutionId: string;
  componentAlias: string;
  componentName: string;
  componentDescription: string;
}

/**
 * Options for {@link buildBuiltInContext}.
 * @public
 */
export interface IBuildBuiltInContextOptions {
  /**
   * When true, GUIDs are derived deterministically from the component alias
   * so that scaffolding is reproducible in CI pipelines and tests.
   */
  ciMode?: boolean;
}

/**
 * The set of context variable names that are automatically provided by the engine.
 * Template authors must not declare custom parameters with any of these names.
 * @public
 */
export const BUILT_IN_PARAMETER_NAMES: ReadonlySet<string> = new Set<string>([
  'solution_name',
  'libraryName',
  'spfxVersion',
  'spfxVersionForBadgeUrl',
  'componentId',
  'featureId',
  'solutionId',
  'componentAlias',
  'componentName',
  'componentDescription'
]);

// Deterministic namespace for CI mode GUIDs, derived from the well-known URL
// namespace: uuidv5('spfx-cli:ci', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
const CI_NAMESPACE: string = '035a23a9-8c9e-569b-ae00-7ff2e4c82fb0';
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';

/**
 * Computes the full set of built-in context variables from the raw CLI inputs.
 *
 * @remarks
 * This is the single source of truth for all variables that every template receives
 * automatically. Custom template parameters (declared in template.json's `parameters`
 * field) are merged separately by the CLI.
 *
 * @public
 */
export function buildBuiltInContext(
  inputs: ISPFxBuiltInContextInputs,
  options?: IBuildBuiltInContextOptions
): ISPFxBuiltInContext {
  const { componentName, libraryName, spfxVersion } = inputs;
  const ciMode: boolean = options?.ciMode === true;

  const componentAlias: string = inputs.componentAlias || componentName;
  const solutionName: string = inputs.solutionName || _toKebabCase(componentName);
  const componentDescription: string = inputs.componentDescription || `${componentName} description`;

  const componentId: string = ciMode ? uuidv5(`component:${componentAlias}`, CI_NAMESPACE) : randomUUID();
  const solutionId: string = ciMode ? CI_SOLUTION_ID : randomUUID();
  const featureId: string = ciMode ? uuidv5(`feature:${componentAlias}`, CI_NAMESPACE) : randomUUID();

  return {
    solution_name: solutionName,
    libraryName,
    spfxVersion,
    spfxVersionForBadgeUrl: spfxVersion.replace(/-/g, '--'),
    componentId,
    featureId,
    solutionId,
    componentAlias,
    componentName,
    componentDescription
  };
}

/**
 * Splits a string into words, handling camelCase, PascalCase, hyphen-case,
 * snake_case, and whitespace boundaries.
 */
function _splitWords(input: string): string[] {
  // Insert a boundary before uppercase letters that follow lowercase letters (camelCase)
  const spaced: string = input.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Split on non-alphanumeric characters and filter empty segments
  return spaced.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 0);
}

function _toKebabCase(input: string): string {
  return _splitWords(input)
    .map((w) => w.toLowerCase())
    .join('-');
}
