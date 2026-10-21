// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { JsonFile } from '@rushstack/node-core-library';

export const SOURCE_SPFX_VERSION = '1.24.0-beta.2';
export const TARGET_SPFX_VERSION = '1.24.0-rc.0';

/** @param {Buffer} original */
export function createNode24TemplateProfile(original) {
  const text = original.toString('utf8');
  assert.deepEqual(Buffer.from(text), original, 'Template metadata must be valid UTF-8');
  const manifest = JsonFile.parseString(text);
  assert.equal(manifest.name, 'copilot-component-react');
  assert.equal(manifest.category, 'copilot');
  assert.equal(manifest.spfxVersion, SOURCE_SPFX_VERSION);
  const updatedText = JsonFile.updateString(text, { ...manifest, spfxVersion: TARGET_SPFX_VERSION });
  const effective = Buffer.from(updatedText);
  const parsed = JsonFile.parseString(updatedText);
  assert.deepEqual(
    { ...parsed, spfxVersion: SOURCE_SPFX_VERSION },
    manifest,
    'Unexpected template metadata change'
  );
  return {
    effective,
    overlay: {
      path: 'template.json',
      property: 'spfxVersion',
      sourceValue: SOURCE_SPFX_VERSION,
      effectiveValue: TARGET_SPFX_VERSION,
      sourceSha256: createHash('sha256').update(original).digest('hex'),
      effectiveSha256: createHash('sha256').update(effective).digest('hex'),
      reason:
        'Fixed Node24-compatible official SPFx package target; generation remains owned by the unchanged official CLI/API.'
    }
  };
}
