// Mock for mem-fs-editor ESM module
export interface MemFsEditor {
  write: (path: string, contents: string) => void;
  commit: () => Promise<void>;
  dump: (cwd: string) => { [key: string]: { state: 'modified' | 'deleted'; isNew: boolean } };
}

export function create(store: any): MemFsEditor {
  return {
    write: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
    dump: jest.fn().mockReturnValue({})
  } as unknown as MemFsEditor;
}
