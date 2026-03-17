// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { _ISpfxServe as IServeJson } from '@microsoft/spfx-heft-plugins';

import { JsonMergeHelper } from './JsonMergeHelper';

/**
 * Merge helper for `config/serve.json`.
 *
 * Strategy:
 * - Incoming wins for scalar fields (`$schema`, `port`, `https`, `initialPage`, etc.)
 * - Merge `serveConfigurations` entries by name key
 *
 * @public
 */
export class ServeJsonMergeHelper extends JsonMergeHelper {
  public readonly fileRelativePath: string = 'config/serve.json';

  public merge(existingContent: string, newContent: string): string {
    const existing: Partial<IServeJson> = this.parseJson<Partial<IServeJson>>(existingContent);
    const incoming: Partial<IServeJson> = this.parseJson<Partial<IServeJson>>(newContent);

    const merged: Partial<IServeJson> = { ...existing, ...incoming };

    if (existing.serveConfigurations || incoming.serveConfigurations) {
      merged.serveConfigurations = {
        ...existing.serveConfigurations,
        ...incoming.serveConfigurations
      } as IServeJson['serveConfigurations'];
    }

    return this.serializeJson(merged, existingContent);
  }
}
