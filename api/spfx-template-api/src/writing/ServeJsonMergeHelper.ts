// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { JsonMergeHelper } from './JsonMergeHelper';

interface IServeJson {
  $schema?: string;
  port?: number;
  https?: boolean;
  initialPage?: string;
  serveConfigurations?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Merge helper for `config/serve.json`.
 *
 * Strategy:
 * - Preserve `port`, `https`, `initialPage` from existing
 * - Merge `serveConfigurations` entries by name key
 *
 * @public
 */
export class ServeJsonMergeHelper extends JsonMergeHelper {
  public readonly fileRelativePath: string = 'config/serve.json';

  public merge(existingContent: string, newContent: string): string {
    const existing: IServeJson = this.parseJson<IServeJson>(existingContent);
    const incoming: IServeJson = this.parseJson<IServeJson>(newContent);

    const merged: IServeJson = { ...existing };

    if (existing.serveConfigurations || incoming.serveConfigurations) {
      merged.serveConfigurations = { ...existing.serveConfigurations, ...incoming.serveConfigurations };
    }

    return this.serializeJson(merged);
  }
}
