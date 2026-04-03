// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library', () => {
  const actual: typeof import('@rushstack/node-core-library') = jest.requireActual(
    '@rushstack/node-core-library'
  );
  const { JsonFile, Executable, FileSystem } = actual;
  return {
    ...actual,
    JsonFile: {
      ...JsonFile,
      loadAsync: jest.fn(),
      saveAsync: jest.fn().mockResolvedValue(undefined)
    },
    Executable: {
      ...Executable,
      spawn: jest.fn().mockReturnValue({}),
      waitForExitAsync: jest.fn()
    },
    FileSystem: {
      ...FileSystem,
      isNotExistError: (error: Error) => (error as NodeJS.ErrnoException).code === 'ENOENT'
    }
  };
});

import { Executable, JsonFile } from '@rushstack/node-core-library';
import { StringBufferTerminalProvider, Terminal } from '@rushstack/terminal';

import {
  tryReadPackageManagerFromPackageJsonEnginesAsync,
  writePackageManagerToPackageJsonEnginesAsync,
  VALID_PACKAGE_MANAGERS
} from '../PackageManagerEnginesHelper';

const MockedJsonFile = JsonFile as jest.Mocked<typeof JsonFile>;
const MockedExecutable = Executable as unknown as { spawn: jest.Mock; waitForExitAsync: jest.Mock };

function makeEnoentError(): Error {
  return Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
}

function makePackageJson(engines?: Record<string, string>): object {
  return { name: 'my-project', version: '0.0.1', private: true, ...(engines ? { engines } : {}) };
}

// ---------------------------------------------------------------------------
// tryReadPackageManagerFromPackageJsonEnginesAsync
// ---------------------------------------------------------------------------

describe(tryReadPackageManagerFromPackageJsonEnginesAsync.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when package.json does not exist', async () => {
    MockedJsonFile.loadAsync.mockRejectedValue(makeEnoentError());
    const result = await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(result).toBeUndefined();
  });

  it('returns undefined when the engines field is absent', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson());
    const result = await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(result).toBeUndefined();
  });

  it('returns undefined when engines contains no known package manager', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ node: '>=22.14.0 < 23.0.0' }));
    const result = await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(result).toBeUndefined();
  });

  it.each(VALID_PACKAGE_MANAGERS)('returns %s when it is the only entry in engines', async (pm) => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ [pm]: '>=10' }));
    const result = await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(result).toBe(pm);
  });

  it('ignores non-package-manager entries alongside a known one', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ node: '>=22.14.0', pnpm: '>=10' }));
    const result = await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(result).toBe('pnpm');
  });

  it('throws when multiple known package managers are found in engines', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ npm: '>=10', pnpm: '>=10' }));
    await expect(tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project')).rejects.toThrow(
      /multiple package managers/
    );
  });

  it('throws listing all conflicting managers in the error message', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ npm: '>=10', pnpm: '>=10', yarn: '>=1' }));
    await expect(tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project')).rejects.toThrow(
      /npm.*pnpm.*yarn/
    );
  });

  it('propagates non-ENOENT errors', async () => {
    MockedJsonFile.loadAsync.mockRejectedValue(
      Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
    );
    await expect(tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project')).rejects.toThrow('EACCES');
  });

  it('reads from the correct path', async () => {
    MockedJsonFile.loadAsync.mockRejectedValue(makeEnoentError());
    await tryReadPackageManagerFromPackageJsonEnginesAsync('/my/project');
    expect(MockedJsonFile.loadAsync).toHaveBeenCalledWith('/my/project/package.json');
  });
});

// ---------------------------------------------------------------------------
// writePackageManagerToPackageJsonEnginesAsync
// ---------------------------------------------------------------------------

describe(writePackageManagerToPackageJsonEnginesAsync.name, () => {
  let terminalProvider: StringBufferTerminalProvider;
  let terminal: Terminal;
  let writeWarningLineSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    terminalProvider = new StringBufferTerminalProvider();
    terminal = new Terminal(terminalProvider);
    writeWarningLineSpy = jest.spyOn(terminal, 'writeWarningLine');
    MockedExecutable.spawn.mockReturnValue({});
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '10.15.1', exitCode: 0, signal: null });
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ node: '>=22.14.0 < 23.0.0' }));
  });

  afterEach(() => {
    expect(terminalProvider.getAllOutputAsChunks({ asLines: true })).toMatchSnapshot('terminal output');
  });

  it('writes a >=MAJOR constraint for the detected version', async () => {
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '10.15.1', exitCode: 0, signal: null });
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(MockedJsonFile.saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({ engines: expect.objectContaining({ pnpm: '>=10' }) }),
      '/my/project/package.json',
      expect.anything()
    );
  });

  it.each(VALID_PACKAGE_MANAGERS)('detects version and writes for %s', async (pm) => {
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '9.0.0', exitCode: 0, signal: null });
    await writePackageManagerToPackageJsonEnginesAsync(pm, '/my/project', terminal);

    expect(MockedExecutable.spawn).toHaveBeenCalledWith(
      pm,
      ['--version'],
      expect.objectContaining({ currentWorkingDirectory: '/my/project' })
    );
    expect(MockedJsonFile.saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({ engines: expect.objectContaining({ [pm]: '>=9' }) }),
      expect.any(String),
      expect.anything()
    );
  });

  it('preserves other engines entries when writing', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ node: '>=22.14.0 < 23.0.0' }));
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '10.0.0', exitCode: 0, signal: null });
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(MockedJsonFile.saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        engines: { node: '>=22.14.0 < 23.0.0', pnpm: '>=10' }
      }),
      expect.any(String),
      expect.anything()
    );
  });

  it('overwrites an existing package manager constraint', async () => {
    MockedJsonFile.loadAsync.mockResolvedValue(makePackageJson({ pnpm: '>=9' }));
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '10.0.0', exitCode: 0, signal: null });
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(MockedJsonFile.saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({ engines: expect.objectContaining({ pnpm: '>=10' }) }),
      expect.any(String),
      expect.anything()
    );
  });

  it('spawns pm --version in the target directory', async () => {
    await writePackageManagerToPackageJsonEnginesAsync('npm', '/custom/dir', terminal);
    expect(MockedExecutable.spawn).toHaveBeenCalledWith(
      'npm',
      ['--version'],
      expect.objectContaining({ currentWorkingDirectory: '/custom/dir', stdio: 'pipe' })
    );
  });

  it('saves to the correct path', async () => {
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/custom/dir', terminal);
    expect(MockedJsonFile.saveAsync).toHaveBeenCalledWith(
      expect.anything(),
      '/custom/dir/package.json',
      expect.anything()
    );
  });

  it('warns and skips when version output cannot be parsed', async () => {
    MockedExecutable.waitForExitAsync.mockResolvedValue({ stdout: '', exitCode: 0, signal: null });
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(writeWarningLineSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm'));
    expect(MockedJsonFile.saveAsync).not.toHaveBeenCalled();
  });

  it('warns and skips when spawn throws (e.g. package manager not on PATH)', async () => {
    MockedExecutable.spawn.mockImplementation(() => {
      throw new Error('spawn pnpm ENOENT');
    });
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(writeWarningLineSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm'));
    expect(MockedJsonFile.saveAsync).not.toHaveBeenCalled();
  });

  it('warns and skips when waitForExitAsync rejects', async () => {
    MockedExecutable.waitForExitAsync.mockRejectedValue(new Error('process error'));
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(writeWarningLineSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm'));
    expect(MockedJsonFile.saveAsync).not.toHaveBeenCalled();
  });

  it('warns and skips when package.json does not exist', async () => {
    MockedJsonFile.loadAsync.mockRejectedValue(makeEnoentError());
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);

    expect(writeWarningLineSpy).toHaveBeenCalledWith(expect.stringContaining('package.json'));
    expect(MockedJsonFile.saveAsync).not.toHaveBeenCalled();
  });

  it('propagates non-ENOENT errors from package.json read', async () => {
    MockedJsonFile.loadAsync.mockRejectedValue(
      Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
    );
    await expect(
      writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal)
    ).rejects.toThrow('EACCES');
    expect(MockedJsonFile.saveAsync).not.toHaveBeenCalled();
  });

  it('does not emit a warning on a successful write', async () => {
    await writePackageManagerToPackageJsonEnginesAsync('pnpm', '/my/project', terminal);
  });
});
