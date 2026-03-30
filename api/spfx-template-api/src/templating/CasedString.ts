// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { camelCase, kebabCase, snakeCase, upperFirst } from 'lodash';

/**
 * A string wrapper that exposes pre-computed casing variants.
 *
 * @remarks
 * During template rendering, every plain-string value in the context is
 * automatically wrapped via {@link createCasedString}. This lets templates access any
 * casing on the fly — e.g. `\<%= componentName.pascal %\>` — without the
 * caller having to pre-compute each variant.
 *
 * When used where a primitive string is expected (EJS interpolation,
 * `String()` coercion, template literals), the wrapper returns the original
 * raw value via `toString()`.
 *
 * @public
 */
export interface ICasedString {
  /** camelCase variant (e.g. "helloWorld") */
  readonly camel: string;
  /** PascalCase variant (e.g. "HelloWorld") */
  readonly pascal: string;
  /** hyphen-case variant (e.g. "hello-world") */
  readonly hyphen: string;
  /** UPPER_SNAKE_CASE variant (e.g. "HELLO_WORLD") */
  readonly allCaps: string;
  /** Returns the original raw string so EJS `\<%= varName %\>` renders the unmodified value. */
  toString(): string;
}

/**
 * Creates an {@link ICasedString} from a raw string, pre-computing all casing variants.
 *
 * @public
 */
export function createCasedString(raw: string): ICasedString {
  return {
    camel: camelCase(raw),
    pascal: upperFirst(camelCase(raw)),
    hyphen: kebabCase(raw),
    allCaps: snakeCase(raw).toUpperCase(),
    toString: () => raw
  };
}
