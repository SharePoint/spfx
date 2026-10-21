// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Executable, FileSystem, JsonFile } from '@rushstack/node-core-library';
import { materializeTemplates, SOURCE_COMMIT, TEMPLATE_NAME } from './wrapper/scripts/template-store.mjs';

const tools = path.dirname(fileURLToPath(import.meta.url));

test('preserved wrapper exposes only the fixed profile and forwards generation to the CLI', async (context) => {
  const folder = path.resolve(tools, 'temp', 'wrapper-test');
  await FileSystem.ensureEmptyFolderAsync(folder);
  context.after(async () => {
    await FileSystem.deleteFolderAsync(folder);
  });
  const template = { name: TEMPLATE_NAME, category: 'copilot', version: '0.0.1', spfxVersion: '1.24.0-rc.0' };
  const bytes = Buffer.from(JsonFile.stringify(template));
  const map = `${JSON.stringify({
    schemaVersion: 1,
    repository: 'https://github.com/SharePoint/spfx',
    sourceCommit: SOURCE_COMMIT,
    template: TEMPLATE_NAME,
    files: {
      'template.json': {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        base64: bytes.toString('base64')
      }
    }
  })}\n`;
  await FileSystem.writeFileAsync(path.resolve(folder, 'template-files.json'), map);
  await JsonFile.saveAsync(
    {
      version: '0.0.0-test.1',
      type: 'module',
      spfxSourceBuild: { templateMapSha256: createHash('sha256').update(map).digest('hex') }
    },
    path.resolve(folder, 'package.json')
  );
  for (const filename of ['bin/spfx.mjs', 'scripts/template-store.mjs']) {
    await FileSystem.writeFileAsync(
      path.resolve(folder, filename),
      await FileSystem.readFileAsync(path.resolve(tools, 'wrapper', filename)),
      { ensureFolderExists: true }
    );
  }
  // This fixture observes forwarding only; it is not a scaffold implementation.
  await FileSystem.writeFileAsync(
    path.resolve(folder, 'spfx.cjs'),
    'console.log(JSON.stringify(process.argv.slice(2)));\n'
  );
  await materializeTemplates(folder);
  /** @param {string[]} args @param {number} [expectedCode] */
  async function run(args, expectedCode = 0) {
    const child = Executable.spawn(process.execPath, [path.resolve(folder, 'bin', 'spfx.mjs'), ...args]);
    const result = await Executable.waitForExitAsync(child, { encoding: 'utf8' });
    assert.equal(result.exitCode, expectedCode, result.stderr);
    return result;
  }
  assert.equal((await run(['--version'])).stdout.trim(), '0.0.0-test.1');
  assert.match((await run(['create', '--help'])).stdout, /--target-dir/);
  assert.deepEqual(JsonFile.parseString((await run(['list-templates'])).stdout), { templates: [template] });
  assert.deepEqual(
    JsonFile.parseString(
      (
        await run([
          'create',
          '--template',
          TEMPLATE_NAME,
          '--component-name',
          'Example',
          '--package-manager=none'
        ])
      ).stdout
    ),
    [
      'create',
      '--template',
      TEMPLATE_NAME,
      '--component-name',
      'Example',
      '--package-manager',
      'none',
      '--local-source',
      path.resolve(folder, 'templates')
    ]
  );
  for (const option of [
    '--local-source',
    '--remote-source',
    '--template-url',
    '--spfx-version',
    '--github-token',
    '--loc'
  ]) {
    assert.match((await run(['create', `${option}=forbidden`], 1)).stderr, /Unsupported create option/);
  }
  await run(['create', '--template', 'webpart-react'], 1);
  await run(['create', '--template', TEMPLATE_NAME, '--template', TEMPLATE_NAME], 1);
  await run(['list-templates', '--local-source', 'forbidden'], 1);
  await run(['create', '--', '--template', 'webpart-react'], 1);
  await FileSystem.writeFileAsync(path.resolve(folder, 'templates', TEMPLATE_NAME, 'template.json'), '{}');
  await run(['list-templates'], 1);
});
