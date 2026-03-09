// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'node:path';

import { FILE_LOADER_EXTENSIONS } from '@microsoft/spfx-heft-plugins';

/**
 * Check if a file path has a binary extension, based on the
 * {@link https://www.npmjs.com/package/@microsoft/spfx-heft-plugins | FILE_LOADER_EXTENSIONS}
 * list used to configure webpack asset rules.
 * @internal
 */
export function isBinaryFile(filePath: string): boolean {
  // path.extname returns e.g. ".png"; strip the leading dot for comparison
  const ext: string = path.extname(filePath).toLowerCase().slice(1);
  return FILE_LOADER_EXTENSIONS.includes(ext);
}
