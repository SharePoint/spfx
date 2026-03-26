// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { camelCase, kebabCase, snakeCase, upperFirst } from 'lodash';

/**
 * A string wrapper that exposes pre-computed casing variants.
 *
 * @remarks
 * During template rendering, every plain-string value in the context is
 * automatically wrapped in a `CasedString`. This lets templates access any
 * casing on the fly — e.g. `\<%= componentName.pascal %\>` — without the
 * caller having to pre-compute each variant.
 *
 * When used where a primitive string is expected (EJS interpolation,
 * `String()` coercion, template literals), the wrapper returns the original
 * raw value via {@link CasedString.toString}.
 *
 * @public
 */
export class CasedString {
  /** camelCase variant (e.g. "helloWorld") */
  public readonly camel: string;
  /** PascalCase variant (e.g. "HelloWorld") */
  public readonly pascal: string;
  /** hyphen-case variant (e.g. "hello-world") */
  public readonly hyphen: string;
  /** UPPER_SNAKE_CASE variant (e.g. "HELLO_WORLD") */
  public readonly allCaps: string;

  private readonly _raw: string;

  public constructor(raw: string) {
    this._raw = raw;
    this.camel = camelCase(raw);
    this.pascal = upperFirst(camelCase(raw));
    this.hyphen = kebabCase(raw);
    this.allCaps = snakeCase(raw).toUpperCase();
  }

  /** Returns the original raw string so EJS `\<%= varName %\>` renders the unmodified value. */
  public toString(): string {
    return this._raw;
  }
}
