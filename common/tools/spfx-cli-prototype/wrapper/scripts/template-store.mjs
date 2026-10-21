// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export const TEMPLATE_NAME = 'copilot-component-react';
export const SOURCE_COMMIT = '81de6346606bead19d2aacb52bb0d504cadbea04';

/**
 * @typedef {{ bytes: number, sha256: string, base64: string }} IEncodedFile
 * @typedef {{schemaVersion: number, repository: string, sourceCommit: string, template: string,
 *   files: Record<string, IEncodedFile>}} ITemplateArchive
 * @typedef {{path: string, bytes: Buffer, sha256: string}} IDecodedFile
 * @typedef {{files: IDecodedFile[], manifest: Record<string, unknown>}} IValidatedArchive
 */

/** @param {Buffer} bytes @returns {string} */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {unknown} value @returns {asserts value is Record<string, unknown>} */
function object(value) {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected a JSON object');
}

/** @param {Record<string, unknown>} value @param {string[]} expected @returns {void} */
function exactKeys(value, expected) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unexpected archive properties');
}

/** @param {string} value @returns {void} */
function validatePath(value) {
  assert.ok(
    value.length > 0 && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value),
    `Absolute/empty template path: ${value}`
  );
  for (const segment of value.split('/')) {
    assert.ok(segment !== '' && segment !== '.' && segment !== '..', `Invalid path segment: ${value}`);
    assert.ok(
      !/[<>:"\\|?*\u0000-\u001f]/.test(segment) && !/[. ]$/.test(segment),
      `Nonportable template path: ${value}`
    );
    assert.ok(
      !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
      `Reserved template path: ${value}`
    );
  }
}

/** @param {unknown} archive @returns {IValidatedArchive} */
export function validateArchive(archive) {
  object(archive);
  exactKeys(archive, ['schemaVersion', 'repository', 'sourceCommit', 'template', 'files']);
  assert.equal(archive.schemaVersion, 1, 'Unsupported template archive schema');
  assert.equal(archive.repository, 'https://github.com/SharePoint/spfx');
  assert.equal(archive.sourceCommit, SOURCE_COMMIT);
  assert.equal(archive.template, TEMPLATE_NAME);
  object(archive.files);
  const names = Object.keys(archive.files);
  assert.ok(names.length > 0, 'Empty template archive');
  assert.deepEqual(names, [...names].sort(), 'Template file paths must be in canonical sorted order');
  /** @type {Map<string, string>} */
  const caseNames = new Map();
  /** @type {IDecodedFile[]} */
  const files = [];
  for (const name of names) {
    validatePath(name);
    assert.ok(!caseNames.has(name.toLowerCase()), `Case-colliding template path: ${name}`);
    caseNames.set(name.toLowerCase(), name);
    const entry = archive.files[name];
    object(entry);
    exactKeys(entry, ['bytes', 'sha256', 'base64']);
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, `Invalid byte count: ${name}`);
    assert.ok(
      typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256),
      `Invalid digest: ${name}`
    );
    assert.equal(typeof entry.base64, 'string', `Invalid encoded content: ${name}`);
    const bytes = Buffer.from(entry.base64, 'base64');
    assert.equal(bytes.toString('base64'), entry.base64, `Noncanonical base64: ${name}`);
    assert.equal(bytes.length, entry.bytes, `Byte count mismatch: ${name}`);
    assert.equal(sha256(bytes), entry.sha256, `Digest mismatch: ${name}`);
    files.push({ path: name, bytes, sha256: entry.sha256 });
  }
  for (const name of names) {
    const parts = name.toLowerCase().split('/');
    parts.pop();
    while (parts.length > 0) {
      assert.ok(!caseNames.has(parts.join('/')), `File/directory collision: ${name}`);
      parts.pop();
    }
  }
  const template = files.find((file) => file.path === 'template.json');
  assert.ok(template, 'Missing template.json');
  const manifest = JSON.parse(template.bytes.toString('utf8'));
  object(manifest);
  assert.equal(manifest.name, TEMPLATE_NAME);
  assert.equal(manifest.category, 'copilot');
  return { files, manifest };
}

/** @param {string} filename @param {'file' | 'directory'} type @returns {Promise<void>} */
async function requireOrdinaryPath(filename, type) {
  const stat = await lstat(filename);
  assert.ok(!stat.isSymbolicLink(), `Template link is not permitted: ${filename}`);
  assert.ok(
    type === 'directory' ? stat.isDirectory() : stat.isFile(),
    `Unexpected template path type: ${filename}`
  );
  if (type === 'file') assert.equal(stat.nlink, 1, `Hard-linked template file is not permitted: ${filename}`);
}

/** @param {string} packageRoot @returns {Promise<IValidatedArchive>} */
export async function loadArchive(packageRoot) {
  await requireOrdinaryPath(packageRoot, 'directory');
  const manifestPath = path.resolve(packageRoot, 'package.json');
  const archivePath = path.resolve(packageRoot, 'template-files.json');
  await requireOrdinaryPath(manifestPath, 'file');
  await requireOrdinaryPath(archivePath, 'file');
  const packageJson = JSON.parse(await readFile(manifestPath, 'utf8'));
  const raw = await readFile(archivePath);
  assert.equal(
    sha256(raw),
    packageJson.spfxSourceBuild?.templateMapSha256,
    'Template archive package digest mismatch'
  );
  const parsed = JSON.parse(raw.toString('utf8'));
  assert.equal(`${JSON.stringify(parsed)}\n`, raw.toString('utf8'), 'Template archive is not canonical JSON');
  return validateArchive(parsed);
}

/** @param {string} root @param {string[]} parts @returns {Promise<void>} */
async function requireDirectories(root, parts) {
  await requireOrdinaryPath(root, 'directory');
  for (let length = 1; length <= parts.length; length++) {
    await requireOrdinaryPath(path.resolve(root, ...parts.slice(0, length)), 'directory');
  }
}

/** @param {string} root @returns {Promise<string[]>} */
async function listFiles(root) {
  await requireOrdinaryPath(root, 'directory');
  /** @type {string[]} */
  const result = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    assert.ok(!item.isSymbolicLink(), `Template link is not permitted: ${item.name}`);
    const filename = path.resolve(root, item.name);
    if (item.isDirectory()) {
      const children = await listFiles(filename);
      assert.ok(children.length > 0, `Unexpected empty template directory: ${filename}`);
      for (const child of children) result.push(`${item.name}/${child}`);
    } else {
      await requireOrdinaryPath(filename, 'file');
      result.push(item.name);
    }
  }
  return result.sort();
}

/** @param {string} packageRoot @param {IValidatedArchive} archive @returns {Promise<string>} */
export async function verifyTemplates(packageRoot, archive) {
  const collection = path.resolve(packageRoot, 'templates');
  const root = path.resolve(collection, TEMPLATE_NAME);
  await requireOrdinaryPath(collection, 'directory');
  assert.deepEqual(
    (await readdir(collection)).sort(),
    [TEMPLATE_NAME],
    'Unexpected template collection entries'
  );
  assert.deepEqual(
    await listFiles(root),
    archive.files.map((file) => file.path),
    'Materialized template inventory mismatch'
  );
  for (const file of archive.files) {
    const bytes = await readFile(path.resolve(root, ...file.path.split('/')));
    assert.equal(sha256(bytes), file.sha256, `Materialized template digest mismatch: ${file.path}`);
  }
  return collection;
}

/** @param {string} packageRoot @returns {Promise<number>} */
export async function materializeTemplates(packageRoot) {
  const archive = await loadArchive(packageRoot);
  const collection = path.resolve(packageRoot, 'templates');
  const root = path.resolve(collection, TEMPLATE_NAME);
  // Exclusive creation intentionally rejects existing trees, including links and repeat postinstall runs.
  await mkdir(collection, { mode: 0o700 });
  await mkdir(root, { mode: 0o700 });
  const canonicalRoot = await realpath(root);
  /** @type {Set<string>} */
  const directories = new Set();
  for (const file of archive.files) {
    const parts = file.path.split('/');
    parts.pop();
    for (let length = 1; length <= parts.length; length++) directories.add(parts.slice(0, length).join('/'));
  }
  for (const directory of [...directories].sort()) {
    const parts = directory.split('/');
    await requireDirectories(root, parts.slice(0, -1));
    assert.equal(await realpath(root), canonicalRoot, 'Template root changed during extraction');
    await mkdir(path.resolve(root, ...parts), { mode: 0o700 });
  }
  for (const file of archive.files) {
    const parts = file.path.split('/');
    await requireDirectories(root, parts.slice(0, -1));
    assert.equal(await realpath(root), canonicalRoot, 'Template root changed during extraction');
    const handle = await open(path.resolve(root, ...parts), 'wx', 0o600);
    try {
      await handle.writeFile(file.bytes);
    } finally {
      await handle.close();
    }
  }
  await verifyTemplates(packageRoot, archive);
  return archive.files.length;
}
