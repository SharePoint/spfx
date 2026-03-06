// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// Mock for mem-fs-editor ESM module

export interface IMemFsEditor {
  read: (path: string) => string | undefined;
  write: (path: string, contents: string | Buffer) => void;
  commit: () => Promise<void>;
  dump: (cwd: string) => { [key: string]: { state: 'modified' | 'deleted'; isNew: boolean } };
}

// Export as MemFsEditor for compatibility with existing imports
export type MemFsEditor = IMemFsEditor;

export const create = jest.fn((): IMemFsEditor => {
  const files = new Map<string, string | Buffer>();
  return {
    read: jest.fn((path: string) => {
      const content: string | Buffer | undefined = files.get(path);
      if (content === undefined) return undefined;
      return typeof content === 'string' ? content : content.toString('utf8');
    }),
    write: jest.fn((path: string, contents: string | Buffer) => {
      files.set(path, contents);
    }),
    commit: jest.fn().mockResolvedValue(undefined),
    dump: jest.fn().mockReturnValue({})
  } as unknown as IMemFsEditor;
});
