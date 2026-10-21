// Copyright Bert Jansen. Licensed under the Apache License, Version 2.0.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isBuiltin } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Executable, FileSystem, JsonFile, PackageJsonLookup, Path } from '@rushstack/node-core-library';
import * as esbuild from 'esbuild';
import { parse as parseYaml } from 'yaml';
import { createNode24TemplateProfile, TARGET_SPFX_VERSION } from './template-profile.mjs';
import { SOURCE_COMMIT, TEMPLATE_NAME, validateArchive } from './wrapper/scripts/template-store.mjs';

export const SOURCE_VERSION = '0.1.0-pre.3.prototype.g81de6346606b';
export const PACKAGE_VERSION = `${SOURCE_VERSION}.pack.4`;
export const EXTERNAL_PACKAGE = '@microsoft/spfx-heft-plugins';
const REPOSITORY = 'https://github.com/SharePoint/spfx';
const tools = path.dirname(fileURLToPath(import.meta.url));

/** @param {Buffer | string} bytes */
function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {string} folder @returns {Promise<string[]>} */
async function files(folder) {
  const result = [];
  for (const item of await FileSystem.readFolderItemsAsync(folder, { absolutePaths: true })) {
    if (item.isSymbolicLink()) throw new Error(`Linked packaging input is not permitted: ${item.name}`);
    if (item.isDirectory()) result.push(...(await files(item.name)));
    else if (item.isFile()) result.push(item.name);
    else throw new Error(`Unsupported packaging input: ${item.name}`);
  }
  return result.sort();
}

/** @param {string} filename @param {unknown} value */
async function json(filename, value) {
  await JsonFile.saveAsync(value, filename, { ensureFolderExists: true, prettyFormatting: true });
}

/** @param {string} repo @param {string[]} args */
async function git(repo, args) {
  const child = Executable.spawn('git', args, { currentWorkingDirectory: repo });
  const result = await Executable.waitForExitAsync(child, { encoding: 'utf8' });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(result.signal, null);
  return result.stdout.trim();
}

/** @param {string} templateRoot */
export async function createTemplateArchive(templateRoot) {
  const entries = [];
  let overlay;
  for (const filename of await files(templateRoot)) {
    const relative = Path.convertToSlashes(path.relative(templateRoot, filename));
    const original = await FileSystem.readFileToBufferAsync(filename);
    let bytes = original;
    if (relative === 'template.json') {
      const profile = createNode24TemplateProfile(original);
      bytes = profile.effective;
      overlay = profile.overlay;
    }
    entries.push([
      relative,
      {
        bytes: bytes.length,
        sha256: hash(bytes),
        base64: bytes.toString('base64')
      }
    ]);
  }
  assert.ok(overlay, 'Missing template.json profile');
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const archive = {
    schemaVersion: 1,
    repository: REPOSITORY,
    sourceCommit: SOURCE_COMMIT,
    template: TEMPLATE_NAME,
    files: Object.fromEntries(entries)
  };
  assert.equal(validateArchive(archive).files.length, 26);
  return { bytes: Buffer.from(`${JSON.stringify(archive)}\n`), overlay };
}

/** @param {string} templateMapSha256 */
export function packageManifest(templateMapSha256) {
  return {
    name: 'spfx-cli-source-prototype',
    version: PACKAGE_VERSION,
    private: true,
    description: 'Source-built fixed React SPFx prototype; not a Microsoft-published release.',
    license: '(Apache-2.0 AND MIT AND ISC AND BSD-3-Clause)',
    type: 'module',
    engines: { node: '>=24.15.0 <25.0.0' },
    bin: { spfx: './bin/spfx.mjs' },
    scripts: { postinstall: 'node scripts/materialize-templates.mjs' },
    dependencies: { [EXTERNAL_PACKAGE]: TARGET_SPFX_VERSION },
    files: [
      'bin',
      'scripts',
      'template-files.json',
      'spfx.cjs',
      'spfx.cjs.LEGAL.txt',
      'LICENSE',
      'LICENSE.spfx',
      'licenses.json',
      'module-graph.json',
      'provenance.json'
    ],
    spfxSourceBuild: {
      repository: REPOSITORY,
      commit: SOURCE_COMMIT,
      officialCliVersion: SOURCE_VERSION,
      bundledApiVersion: SOURCE_VERSION,
      externalPackageVersion: TARGET_SPFX_VERSION,
      templateMapSha256
    }
  };
}

/** @param {import('esbuild').Metafile} metadata */
export function auditModuleGraph(metadata) {
  const normalizedOutputs = {};
  const contributors = new Map();
  for (const input of Object.keys(metadata.inputs)) {
    assert.ok(!path.posix.isAbsolute(input) && !path.win32.isAbsolute(input), 'Absolute module graph input');
  }
  for (const [filename, output] of Object.entries(metadata.outputs)) {
    for (const imported of output.imports) {
      assert.ok(
        !imported.external || isBuiltin(imported.path) || imported.path === EXTERNAL_PACKAGE,
        `Unexpected external dependency: ${imported.path}`
      );
    }
    for (const [input, contribution] of Object.entries(output.inputs)) {
      if (contribution.bytesInOutput > 0) {
        assert.ok(
          !/(^|\/)node_modules\/@microsoft\/spfx-heft-plugins\//.test(input),
          'Restricted implementation must not be bundled'
        );
        contributors.set(input, (contributors.get(input) ?? 0) + contribution.bytesInOutput);
      }
    }
    normalizedOutputs[path.basename(filename)] = output;
  }
  return { metadata: { ...metadata, outputs: normalizedOutputs }, contributors };
}

/** @param {string} repo @param {Map<string, number>} contributors */
async function collectLicenses(repo, contributors) {
  const lookup = new PackageJsonLookup();
  const components = new Map();
  const lock = parseYaml(
    await FileSystem.readFileAsync(path.resolve(repo, 'common', 'temp', 'pnpm-lock.yaml'))
  );
  for (const [input, bytesInOutput] of contributors) {
    const folder = lookup.tryGetPackageFolderFor(path.resolve(repo, input));
    assert.ok(folder, `Missing package owner for ${input}`);
    const manifest = await JsonFile.loadAsync(path.resolve(folder, 'package.json'));
    assert.notEqual(manifest.name, EXTERNAL_PACKAGE);
    const sourcePackage = ['@microsoft/spfx-cli', '@microsoft/spfx-template-api'].includes(manifest.name);
    const version = sourcePackage ? SOURCE_VERSION : manifest.version;
    const key = `${manifest.name}@${version}`;
    let component = components.get(key);
    if (!component) {
      const licenseFiles = (await FileSystem.readFolderItemsAsync(folder, { absolutePaths: true }))
        .filter(
          (item) =>
            item.isFile() &&
            /^(licen[cs]e|copying|notice|thirdpartynotice)(\.|$|-)/i.test(path.basename(item.name))
        )
        .map((item) => item.name)
        .sort();
      if (sourcePackage && licenseFiles.length === 0) licenseFiles.push(path.resolve(repo, 'LICENSE'));
      assert.ok(licenseFiles.length, `Missing full license text: ${key}`);
      const licenseText = (
        await Promise.all(licenseFiles.map((file) => FileSystem.readFileAsync(file)))
      ).join('\n\n');
      const license = typeof manifest.license === 'string' ? manifest.license : manifest.license?.type;
      assert.ok(
        ['MIT', 'ISC', 'BSD-3-Clause', 'Apache-2.0'].includes(license),
        `Unreviewed license for this fixed prototype: ${key}`
      );
      component = {
        name: manifest.name,
        version,
        license,
        licenseText,
        licenseSha256: hash(licenseText),
        source: sourcePackage
          ? { repository: REPOSITORY, commit: SOURCE_COMMIT }
          : {
              package: `${manifest.name}@${manifest.version}`,
              integrity:
                lock.packages?.[`${manifest.name}@${manifest.version}`]?.resolution?.integrity ?? null
            },
        modules: [],
        bytesInOutput: 0
      };
      components.set(key, component);
    }
    component.modules.push(input);
    component.bytesInOutput += bytesInOutput;
  }
  return [...components.values()].sort((a, b) =>
    `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
  );
}

/** @param {string} source @param {string} destination */
export async function buildPrototype(source, destination) {
  const repo = path.resolve(source);
  const output = path.resolve(destination);
  assert.equal(process.versions.node.split('.')[0], '24');
  assert.ok(Number(process.versions.node.split('.')[1]) >= 15, 'Use Node >=24.15');
  assert.equal(
    await git(repo, ['rev-parse', 'HEAD']),
    SOURCE_COMMIT,
    'Use the pinned upstream source checkout'
  );
  assert.equal(await git(repo, ['status', '--porcelain']), '', 'Source checkout must be clean');
  assert.ok(!(await FileSystem.existsAsync(output)), 'Use a new output directory');
  assert.ok(!output.startsWith(`${repo}${path.sep}`), 'Keep generated artifacts outside the source checkout');
  const packageRoot = path.resolve(output, 'package');
  const manifests = new Map();
  for (const relative of ['apps/spfx-cli/package.json', 'api/spfx-template-api/package.json']) {
    const filename = path.resolve(repo, relative);
    const manifest = await JsonFile.loadAsync(filename);
    manifest.version = SOURCE_VERSION;
    if (manifest.name === '@microsoft/spfx-cli')
      manifest.dependencies['@microsoft/spfx-template-api'] = SOURCE_VERSION;
    manifests.set(filename, manifest);
  }
  const result = await esbuild.build({
    absWorkingDir: repo,
    entryPoints: [path.resolve(repo, 'apps', 'spfx-cli', 'src', 'start.ts')],
    alias: {
      '@microsoft/spfx-template-api': path.resolve(repo, 'api', 'spfx-template-api', 'src', 'index.ts')
    },
    outfile: path.resolve(packageRoot, 'spfx.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    external: [EXTERNAL_PACKAGE],
    minifyWhitespace: true,
    minifySyntax: true,
    legalComments: 'external',
    sourcemap: false,
    metafile: true,
    plugins: [
      {
        name: 'staged-prototype-package-identity',
        setup(build) {
          build.onLoad({ filter: /package\.json$/ }, async (args) => {
            const manifest = manifests.get(path.resolve(args.path));
            return manifest ? { contents: JsonFile.stringify(manifest), loader: 'json' } : undefined;
          });
        }
      }
    ]
  });
  const { metadata, contributors } = auditModuleGraph(result.metafile);
  const components = await collectLicenses(repo, contributors);
  const archive = await createTemplateArchive(path.resolve(repo, 'templates', TEMPLATE_NAME));
  const manifest = packageManifest(hash(archive.bytes));
  await json(path.resolve(packageRoot, 'package.json'), manifest);
  await json(path.resolve(packageRoot, 'module-graph.json'), metadata);
  await json(path.resolve(packageRoot, 'licenses.json'), { schemaVersion: 1, components });
  await FileSystem.writeFileAsync(path.resolve(packageRoot, 'template-files.json'), archive.bytes);
  for (const filename of await files(path.resolve(tools, 'wrapper'))) {
    await FileSystem.writeFileAsync(
      path.resolve(packageRoot, path.relative(path.resolve(tools, 'wrapper'), filename)),
      await FileSystem.readFileToBufferAsync(filename),
      { ensureFolderExists: true }
    );
  }
  for (const [from, to] of [
    [path.resolve(tools, 'LICENSE'), path.resolve(packageRoot, 'LICENSE')],
    [path.resolve(repo, 'LICENSE'), path.resolve(packageRoot, 'LICENSE.spfx')],
    [
      path.resolve(repo, 'common', 'config', 'rush', 'pnpm-lock.yaml'),
      path.resolve(output, 'source-pnpm-lock.yaml')
    ],
    [path.resolve(repo, 'common', 'temp', 'pnpm-lock.yaml'), path.resolve(output, 'restored-pnpm-lock.yaml')],
    [path.resolve(tools, 'package-lock.json'), path.resolve(output, 'packaging-package-lock.json')]
  ]) {
    await FileSystem.writeFileAsync(to, await FileSystem.readFileToBufferAsync(from), {
      ensureFolderExists: true
    });
  }
  const inventory = [];
  for (const filename of await files(packageRoot)) {
    inventory.push({
      path: Path.convertToSlashes(path.relative(packageRoot, filename)),
      sha256: hash(await FileSystem.readFileToBufferAsync(filename))
    });
  }
  await json(path.resolve(packageRoot, 'provenance.json'), {
    schemaVersion: 1,
    source: { repository: REPOSITORY, commit: SOURCE_COMMIT },
    identity: manifest.description,
    sourceVersion: SOURCE_VERSION,
    packageVersion: PACKAGE_VERSION,
    node: process.versions.node,
    esbuild: esbuild.version,
    externalDependency: {
      name: EXTERNAL_PACKAGE,
      sourceVersion: '1.23.2',
      packageVersion: TARGET_SPFX_VERSION,
      licenseUrl: 'https://aka.ms/spfx/license',
      bundled: false
    },
    templateOverlay: archive.overlay,
    unchangedTemplateFiles: 25,
    files: inventory,
    limitations: [
      'Sanitized source-preservation recipe, not a rebuild of a historical consumer artifact.',
      'No lifecycle-script approval, external dependency installation, publishing, or deployment is performed by this script.'
    ]
  });
  assert.equal(await git(repo, ['status', '--porcelain']), '', 'Packaging modified upstream source');
  console.log(`Prepared ${manifest.name}@${manifest.version}; use npm pack in the output package directory.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    4,
    'Usage: node build.mjs <pinned-source-checkout> <new-output-directory>'
  );
  await buildPrototype(process.argv[2], process.argv[3]);
}
