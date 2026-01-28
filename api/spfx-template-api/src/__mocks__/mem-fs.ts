// Mock for mem-fs ESM module
export interface IStore {
  // Mock interface
}

// Export as Store for compatibility with existing imports (with generic for type compatibility)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Store<T = unknown> = IStore;

export function create(): IStore {
  return {} as IStore;
}
