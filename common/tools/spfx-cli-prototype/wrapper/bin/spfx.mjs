#!/usr/bin/env node
// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import packageJson from '../package.json' with { type: 'json' };
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArchive, TEMPLATE_NAME, verifyTemplates } from '../scripts/template-store.mjs';

const help = `Source-built SharePoint SPFx CLI prototype

Usage:
  spfx --version
  spfx list-templates
  spfx create --component-name NAME [options]

The only packaged template is copilot-component-react. No network template source is used.

Create options:
  --template copilot-component-react  Optional fixed template selector
  --component-name NAME               Required display name
  --solution-name NAME                Solution name
  --library-name NAME                 npm library name
  --target-dir PATH                   Scaffold destination
  --component-alias ALIAS             Component alias
  --component-description TEXT        Component description
  --package-manager {none,npm}        Optional dependency install (default: none)
  -h, --help                         Show this help
`;

/** @param {string[]} args @returns {string[]} */
function createArguments(args) {
  const allowed = new Set([
    '--template',
    '--component-name',
    '--solution-name',
    '--library-name',
    '--target-dir',
    '--component-alias',
    '--component-description',
    '--package-manager'
  ]);
  const seen = new Set();
  /** @type {string[]} */
  const forwarded = [];
  for (let index = 0; index < args.length; index++) {
    const raw = args[index];
    const separator = raw.indexOf('=');
    const name = separator < 0 ? raw : raw.slice(0, separator);
    if (!allowed.has(name))
      throw new Error(`Unsupported create option "${name}"; template/source overrides are not allowed.`);
    if (seen.has(name)) throw new Error(`Duplicate create option "${name}".`);
    seen.add(name);
    const value = separator < 0 ? args[++index] : raw.slice(separator + 1);
    if (!value || value.startsWith('--')) throw new Error(`A value is required for "${name}".`);
    if (name === '--template') {
      if (value !== TEMPLATE_NAME) throw new Error(`Only "${TEMPLATE_NAME}" is supported.`);
    } else {
      if (name === '--package-manager' && value !== 'none' && value !== 'npm') {
        throw new Error('Only package managers "none" and "npm" are supported.');
      }
      forwarded.push(name, value);
    }
  }
  return forwarded;
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--version') {
    console.log(packageJson.version);
  } else if (
    args.length === 0 ||
    (args.length === 1 && ['--help', '-h'].includes(args[0])) ||
    (args.length === 2 &&
      ['create', 'list-templates'].includes(args[0]) &&
      ['--help', '-h'].includes(args[1]))
  ) {
    console.log(help);
  } else {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    if (args[0] === 'list-templates') {
      if (args.length !== 1) throw new Error('list-templates does not accept source/template overrides.');
      const archive = await loadArchive(packageRoot);
      await verifyTemplates(packageRoot, archive);
      console.log(JSON.stringify({ templates: [archive.manifest] }));
    } else if (args[0] === 'create') {
      const forwarded = createArguments(args.slice(1));
      const archive = await loadArchive(packageRoot);
      const collection = await verifyTemplates(packageRoot, archive);
      process.argv = [
        process.argv[0],
        process.argv[1],
        'create',
        '--template',
        TEMPLATE_NAME,
        ...forwarded,
        '--local-source',
        collection
      ];
      await import('../spfx.cjs');
    } else {
      throw new Error(`Unsupported command "${args[0]}". Use --help for the packaged interface.`);
    }
  }
} catch (error) {
  console.error(`SPFx package wrapper: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
