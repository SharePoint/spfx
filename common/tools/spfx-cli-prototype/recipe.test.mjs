// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { FileSystem } from '@rushstack/node-core-library';
import { auditModuleGraph, createTemplateArchive, EXTERNAL_PACKAGE, packageManifest } from './build.mjs';
import { validateArchive } from './wrapper/scripts/template-store.mjs';

const tools = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(tools, '..', '..', '..', 'templates', 'copilot-component-react');

test('recipe transports all 26 original files with exactly one recorded metadata overlay', async () => {
  const result = await createTemplateArchive(templateRoot);
  const archive = validateArchive(JSON.parse(result.bytes.toString('utf8')));
  assert.equal(archive.files.length, 26);
  assert.equal(archive.manifest.spfxVersion, '1.24.0-rc.0');
  assert.equal(result.overlay.sourceValue, '1.24.0-beta.2');
  assert.equal(result.overlay.effectiveValue, '1.24.0-rc.0');
  for (const file of archive.files) {
    const original = await FileSystem.readFileToBufferAsync(path.resolve(templateRoot, file.path));
    if (file.path === 'template.json') {
      assert.equal(file.bytes.toString(), original.toString().replace('"1.24.0-beta.2"', '"1.24.0-rc.0"'));
    } else {
      assert.deepEqual(file.bytes, original, file.path);
    }
  }
});

test('portable manifest has no internal consumer dependency and cannot be published accidentally', () => {
  const manifest = packageManifest('0'.repeat(64));
  assert.equal(manifest.private, true);
  assert.equal(manifest.name, 'spfx-cli-source-prototype');
  assert.deepEqual(manifest.dependencies, { [EXTERNAL_PACKAGE]: '1.24.0-rc.0' });
  assert.equal(manifest.scripts.postinstall, 'node scripts/materialize-templates.mjs');
  assert.ok(manifest.files.includes('template-files.json'));
});

test('module graph rejects non-approved externals and restricted implementation bytes', () => {
  const input = 'apps/spfx-cli/src/start.ts';
  /** @param {string} imported @param {string} [contributor] @returns {import('esbuild').Metafile} */
  function graph(imported, contributor = input) {
    return {
      inputs: { [contributor]: { bytes: 10, imports: [] } },
      outputs: {
        'output/spfx.cjs': {
          bytes: 10,
          exports: [],
          imports: [{ path: imported, external: true, kind: 'require-call' }],
          inputs: { [contributor]: { bytesInOutput: 10 } }
        }
      }
    };
  }
  assert.equal(auditModuleGraph(graph('node:fs')).contributors.get(input), 10);
  assert.ok(auditModuleGraph(graph(EXTERNAL_PACKAGE)).metadata.outputs['spfx.cjs']);
  assert.throws(() => auditModuleGraph(graph('unexpected-package')), /Unexpected external/);
  assert.throws(() =>
    auditModuleGraph(graph('node:fs', 'node_modules/@microsoft/spfx-heft-plugins/index.js'))
  );
  assert.throws(() => auditModuleGraph(graph('node:fs', 'C:/absolute/input.js')), /Absolute/);
});
