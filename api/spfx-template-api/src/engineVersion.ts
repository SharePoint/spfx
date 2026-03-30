// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import ownPackageJson from '../package.json';

/**
 * The engine version of the `@microsoft/spfx-template-api` package.
 * Templates can declare a `minimumEngineVersion` in template.json to require
 * at least this version of the engine.
 * @public
 */
export const ENGINE_VERSION: string = ownPackageJson.version;
