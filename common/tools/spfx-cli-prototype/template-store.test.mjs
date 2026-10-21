// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  loadArchive,
  materializeTemplates,
  SOURCE_COMMIT,
  TEMPLATE_NAME,
  validateArchive,
  verifyTemplates
} from './wrapper/scripts/template-store.mjs';

const tools = path.dirname(fileURLToPath(import.meta.url));
const testRoot = path.resolve(tools, 'temp', 'template-tests');
await mkdir(testRoot, { recursive: true });

/** @param {string | Buffer} value */
function encoded(value) {
  const bytes = Buffer.from(value);
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    base64: bytes.toString('base64')
  };
}

/** @param {Array<[string, ReturnType<typeof encoded>]>} [extras] */
function archive(extras = []) {
  const files = new Map([
    ['.gitignore', encoded('node_modules/\r\n')],
    ['.npmignore', encoded('*\n')],
    ['copilot/icon.png', encoded(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 255]))],
    [
      'template.json',
      encoded(
        JSON.stringify({
          name: TEMPLATE_NAME,
          category: 'copilot',
          version: '0.0.1',
          spfxVersion: '1.24.0-beta.2'
        })
      )
    ],
    ...extras
  ]);
  return {
    schemaVersion: 1,
    repository: 'https://github.com/SharePoint/spfx',
    sourceCommit: SOURCE_COMMIT,
    template: TEMPLATE_NAME,
    files: Object.fromEntries([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  };
}

/** @param {import('node:test').TestContext} context @param {string} [text] */
async function fixture(context, text = `${JSON.stringify(archive())}\n`) {
  const root = await mkdtemp(path.resolve(testRoot, 'case-'));
  context.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(path.resolve(root, 'template-files.json'), text);
  await writeFile(
    path.resolve(root, 'package.json'),
    JSON.stringify({
      spfxSourceBuild: { templateMapSha256: createHash('sha256').update(text).digest('hex') }
    })
  );
  return root;
}

test('canonical map restores exact binary bytes and npm-filtered dotfiles offline', async (context) => {
  const root = await fixture(context);
  assert.equal(await materializeTemplates(root), 4);
  const decoded = await loadArchive(root);
  await verifyTemplates(root, decoded);
  for (const file of decoded.files) {
    assert.deepEqual(await readFile(path.resolve(root, 'templates', TEMPLATE_NAME, file.path)), file.bytes);
  }
});

for (const filename of [
  '../outside',
  '/absolute',
  'C:/absolute',
  'C:relative',
  '//server/share',
  'a\\b',
  'a//b',
  './dot',
  'a/../b',
  'a/trailing.',
  'a/trailing ',
  'nul.txt',
  'CON',
  'COM1/x',
  'name:stream'
]) {
  test(`rejects unsafe path ${filename}`, () => {
    assert.throws(() => validateArchive(archive([[filename, encoded('x')]])));
  });
}

test('rejects case collisions and file-directory collisions', () => {
  assert.throws(
    () =>
      validateArchive(
        archive([
          ['File', encoded('x')],
          ['file', encoded('y')]
        ])
      ),
    /Case-colliding/
  );
  assert.throws(() => validateArchive(archive([['copilot', encoded('x')]])), /File\/directory collision/);
});

test('rejects wrong content hash, byte length, and noncanonical base64', () => {
  assert.throws(
    () => validateArchive(archive([['bad', { ...encoded('x'), sha256: '0'.repeat(64) }]])),
    /Digest mismatch/
  );
  assert.throws(
    () => validateArchive(archive([['bad', { ...encoded('x'), bytes: 0 }]])),
    /Byte count mismatch/
  );
  assert.throws(
    () => validateArchive(archive([['bad', { ...encoded('x'), base64: 'eA==\n' }]])),
    /Noncanonical base64/
  );
});

test('rejects non-pinned source, other template categories and extra metadata', () => {
  assert.throws(() => validateArchive({ ...archive(), sourceCommit: '0'.repeat(40) }));
  assert.throws(() =>
    validateArchive(
      archive([['template.json', encoded(JSON.stringify({ name: TEMPLATE_NAME, category: 'webpart' }))]])
    )
  );
  assert.throws(() => validateArchive(archive([['bad', { ...encoded('x'), link: '/outside' }]])));
});

test('digest or canonical JSON failure occurs before extraction', async (context) => {
  const root = await fixture(context);
  await writeFile(path.resolve(root, 'template-files.json'), '{}');
  await assert.rejects(materializeTemplates(root), /package digest mismatch/);
  const pretty = await fixture(context, JSON.stringify(archive(), null, 2));
  await assert.rejects(materializeTemplates(pretty), /not canonical/);
});

test('rejects overwriting an existing collection and leaves it untouched', async (context) => {
  const root = await fixture(context);
  await mkdir(path.resolve(root, 'templates'));
  const sentinel = path.resolve(root, 'templates', 'sentinel');
  await writeFile(sentinel, 'keep');
  await assert.rejects(materializeTemplates(root), { code: 'EEXIST' });
  assert.equal(await readFile(sentinel, 'utf8'), 'keep');
});

test('rejects a junction collection without writing through it', async (context) => {
  const root = await fixture(context);
  const outside = await fixture(context);
  await symlink(outside, path.resolve(root, 'templates'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(materializeTemplates(root), { code: 'EEXIST' });
  await assert.rejects(readFile(path.resolve(outside, TEMPLATE_NAME, 'template.json')), { code: 'ENOENT' });
});

test('rejects repeated postinstall, tampered files, hard links and added directories', async (context) => {
  const root = await fixture(context);
  await materializeTemplates(root);
  await assert.rejects(materializeTemplates(root), { code: 'EEXIST' });
  const decoded = await loadArchive(root);
  const dotfile = path.resolve(root, 'templates', TEMPLATE_NAME, '.gitignore');
  const original = await readFile(dotfile);
  await writeFile(dotfile, 'changed');
  await assert.rejects(verifyTemplates(root, decoded), /digest mismatch/);
  await writeFile(dotfile, original);
  const hardlink = path.resolve(root, 'external-hardlink');
  await link(dotfile, hardlink);
  await assert.rejects(verifyTemplates(root, decoded), /Hard-linked/);
  await rm(hardlink);
  await mkdir(path.resolve(root, 'templates', TEMPLATE_NAME, 'unexpected'));
  await assert.rejects(verifyTemplates(root, decoded), /Unexpected empty/);
});
