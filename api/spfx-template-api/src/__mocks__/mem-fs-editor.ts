// Mock for mem-fs-editor ESM module
export interface IMemFsEditor {
  write: (path: string, contents: string) => void;
  commit: () => Promise<void>;
  dump: (cwd: string) => { [key: string]: { state: 'modified' | 'deleted'; isNew: boolean } };
}

// Export as MemFsEditor for compatibility with existing imports
export type MemFsEditor = IMemFsEditor;

export function create(store: unknown): IMemFsEditor {
  return {
    write: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
    dump: jest.fn().mockReturnValue({})
  } as unknown as IMemFsEditor;
}
