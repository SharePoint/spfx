// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// Mock for mem-fs ESM module

export interface IStore {
  // Mock interface
}

// Export as Store for compatibility with existing imports (with generic for type compatibility)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Store<T = unknown> = IStore;

export const create = jest.fn((): IStore => ({}) as IStore);
