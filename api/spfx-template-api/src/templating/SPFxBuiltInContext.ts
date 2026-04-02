// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { randomUUID } from 'node:crypto';

import { kebabCase } from 'lodash';
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
  /** Optional override for the solution folder name; defaults to hyphen-cased componentName */
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
  /** Hyphen-cased solution folder name (e.g. "hello-world"). */
  solution_name: string;
  /** npm package / library name (e.g. "\@contoso/hello-world"). */
  libraryName: string;
  /** SPFx version from the template manifest (e.g. "1.22.2"). */
  spfxVersion: string;
  /** SPFx version with hyphens escaped for shields.io badge URLs (e.g. "1.23.0--beta.0"). */
  spfxVersionForBadgeUrl: string;
  /** Random (or deterministic in CI mode) GUID identifying the component. */
  componentId: string;
  /** Random (or deterministic in CI mode) GUID identifying the solution feature. */
  featureId: string;
  /** Random (or deterministic in CI mode) GUID identifying the solution package. */
  solutionId: string;
  /** Short identifier used in the component manifest; defaults to componentName. */
  componentAlias: string;
  /** Human-readable component name as provided by the caller (e.g. "Hello World"). */
  componentName: string;
  /** Description of the component; defaults to "\{componentName\} description". */
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
 * Helper that enforces the array is exactly the keys of ISPFxBuiltInContext:
 * - `T extends ReadonlyArray<keyof ISPFxBuiltInContext>` — no extra keys
 * - `[keyof ISPFxBuiltInContext] extends [T[number]]` — no missing keys
 * The `const` modifier on T ensures elements are inferred as string literals.
 */
function _makeBuiltInParameterNames<const T extends ReadonlyArray<keyof ISPFxBuiltInContext>>(
  names: [keyof ISPFxBuiltInContext] extends [T[number]] ? T : never
): ReadonlySet<keyof ISPFxBuiltInContext> {
  return new Set(names);
}

/**
 * The set of context variable names that are automatically provided by the engine.
 * Used to identify which context variables are engine-provided.
 * @public
 */
export const BUILT_IN_PARAMETER_NAMES: ReadonlySet<keyof ISPFxBuiltInContext> = _makeBuiltInParameterNames([
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

// Deterministic namespace for CI mode GUIDs.  This is a real UUID v5 value
// derived from the well-known URL namespace so that each component alias
// produces a unique but reproducible set of IDs:
//   uuidv5('spfx-cli:ci', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
const CI_NAMESPACE: string = '035a23a9-8c9e-569b-ae00-7ff2e4c82fb0';
// Dummy solution ID — obviously fake (all 2s) so it is never mistaken for a
// real GUID in generated output.
const CI_SOLUTION_ID: string = '22222222-2222-2222-2222-222222222222';

/**
 * Computes the full set of built-in context variables from the raw CLI inputs.
 *
 * @remarks
 * This is the single source of truth for all variables that every template receives
 * automatically.
 *
 * @public
 */
export function buildBuiltInContext(
  inputs: ISPFxBuiltInContextInputs,
  options?: IBuildBuiltInContextOptions
): ISPFxBuiltInContext {
  const {
    componentName,
    libraryName,
    spfxVersion,
    componentAlias = componentName,
    solutionName = toHyphenCase(componentName),
    componentDescription = `${componentName} description`
  } = inputs;
  const ciMode: boolean = options?.ciMode === true;

  let componentId: string;
  let solutionId: string;
  let featureId: string;
  if (ciMode) {
    componentId = uuidv5(`component:${componentAlias}`, CI_NAMESPACE);
    solutionId = CI_SOLUTION_ID;
    featureId = uuidv5(`feature:${componentAlias}`, CI_NAMESPACE);
  } else {
    componentId = randomUUID();
    solutionId = randomUUID();
    featureId = randomUUID();
  }

  return {
    solution_name: solutionName,
    libraryName,
    spfxVersion,
    // The shields.io badge URL uses hyphens as separators, so hyphens in version
    // numbers need to be escaped as double-hyphens to avoid ambiguity.
    // For example, "1.23.0-beta.0" becomes "1.23.0--beta.0".
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
 * Converts a string to hyphen-case (e.g. "Hello World" → "hello-world").
 *
 * @remarks
 * Delegates to lodash `kebabCase` so that `solution_name` is consistent with
 * the `.hyphen` casing produced by {@link createCasedString}.
 * Exported for callers (such as the CLI) that need the same derivation before
 * the full built-in context is available.
 *
 * @public
 */
export function toHyphenCase(input: string): string {
  return kebabCase(input);
}
