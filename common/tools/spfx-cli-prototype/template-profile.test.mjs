// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNode24TemplateProfile } from './template-profile.mjs';

test('profile changes exactly the pinned spfxVersion value and preserves other metadata bytes', () => {
  const source = Buffer.from(
    '{\n  "name": "copilot-component-react",\n  "category": "copilot",\n  "version": "0.0.1",\n  "spfxVersion": "1.24.0-beta.2"\n}\n'
  );
  const { effective, overlay } = createNode24TemplateProfile(source);
  assert.equal(effective.toString(), source.toString().replace('"1.24.0-beta.2"', '"1.24.0-rc.0"'));
  assert.equal(overlay.property, 'spfxVersion');
  assert.notEqual(overlay.sourceSha256, overlay.effectiveSha256);
});

test('profile rejects another template, category, version or invalid UTF8', () => {
  const source = '{"name":"copilot-component-react","category":"copilot","spfxVersion":"1.24.0-beta.2"}';
  assert.throws(() =>
    createNode24TemplateProfile(Buffer.from(source.replace('copilot-component-react', 'webpart-react')))
  );
  assert.throws(() => createNode24TemplateProfile(Buffer.from(source.replace('"copilot"', '"webpart"'))));
  assert.throws(() => createNode24TemplateProfile(Buffer.from(source.replace('1.24.0-beta.2', '1.23.2'))));
  assert.throws(() => createNode24TemplateProfile(Buffer.from([0xff, 0xfe, 0])));
});
