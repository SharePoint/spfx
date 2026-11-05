// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ChildProcess } from 'node:child_process';

import { Executable } from '@rushstack/node-core-library';

import { readChangelogSectionFromTgzAsync, readPackageInfoFromTgzAsync } from '../PackageTgzUtilities';

function mockTarStdout(stdout: string, exitCode: number = 0): void {
  jest.spyOn(Executable, 'spawn').mockReturnValue({} as ChildProcess);
  jest.spyOn(Executable, 'waitForExitAsync').mockResolvedValue({ stdout, exitCode } as never);
}

function mockTarThrows(error: Error): void {
  jest.spyOn(Executable, 'spawn').mockReturnValue({} as ChildProcess);
  jest.spyOn(Executable, 'waitForExitAsync').mockRejectedValue(error);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe(readPackageInfoFromTgzAsync.name, () => {
  it('parses package.json from tar output', async () => {
    mockTarStdout(JSON.stringify({ name: '@microsoft/my-package', version: '1.2.3' }));

    const result = await readPackageInfoFromTgzAsync('/path/to/package.tgz');
    expect(result.name).toBe('@microsoft/my-package');
    expect(result.version).toBe('1.2.3');
  });

  it('throws when tar exits with non-zero exit code', async () => {
    mockTarThrows(new Error('Process exited with code 1'));

    await expect(readPackageInfoFromTgzAsync('/path/to/package.tgz')).rejects.toThrow(
      'Process exited with code 1'
    );
  });
});

describe(readChangelogSectionFromTgzAsync.name, () => {
  const changelog: string = [
    '# Changelog',
    '',
    '## 2.0.0',
    '### Breaking changes',
    '- Removed old API',
    '',
    '## 1.2.3',
    '### New features',
    '- Added foo',
    '- Added bar',
    '',
    '## 1.0.0',
    '- Initial release'
  ].join('\n');

  it('returns the section body for the requested version', async () => {
    mockTarStdout(changelog);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '1.2.3');
    expect(result).toBe('### New features\n- Added foo\n- Added bar');
  });

  it('returns the last section body when there is no following section', async () => {
    mockTarStdout(changelog);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '1.0.0');
    expect(result).toBe('- Initial release');
  });

  it('returns undefined when the version is not found', async () => {
    mockTarStdout(changelog);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '9.9.9');
    expect(result).toBeUndefined();
  });

  it('does not match a version that is a prefix of another version', async () => {
    // '1.0.0' should not match '## 1.0.0-alpha.1' or similar
    const changelogWithPrerelease: string = [
      '# Changelog',
      '',
      '## 1.0.0-alpha.1',
      '- Prerelease',
      '',
      '## 1.0.0',
      '- Initial release'
    ].join('\n');
    mockTarStdout(changelogWithPrerelease);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '1.0.0');
    expect(result).toBe('- Initial release');
  });

  it('returns undefined when tar exits with non-zero exit code', async () => {
    mockTarStdout('', 1);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '1.2.3');
    expect(result).toBeUndefined();
  });

  it('handles CRLF line endings', async () => {
    const crlfChangelog: string = changelog.replace(/\n/g, '\r\n');
    mockTarStdout(crlfChangelog);

    const result = await readChangelogSectionFromTgzAsync('/path/to/package.tgz', '1.2.3');
    expect(result).toBe('### New features\n- Added foo\n- Added bar');
  });
});
