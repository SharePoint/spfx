// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeTemplates } from './template-store.mjs';

try {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const count = await materializeTemplates(packageRoot);
  console.log(`Restored and verified ${count} pinned official React template files offline.`);
} catch (error) {
  console.error(`SPFx template extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
