# Fixed React CLI packaging prototype

This developer-only directory preserves the source of a previous CLI packaging
experiment so reviewers can retrieve it from Git. It does **not** change the
published CLI/API, add a new CLI mode, register a Rush project, or implement an
application integration.

The official implementation is unchanged at
[`81de6346606bead19d2aacb52bb0d504cadbea04`](https://github.com/SharePoint/spfx/tree/81de6346606bead19d2aacb52bb0d504cadbea04):

- [CLI](https://github.com/SharePoint/spfx/tree/81de6346606bead19d2aacb52bb0d504cadbea04/apps/spfx-cli/src)
- [Template API](https://github.com/SharePoint/spfx/tree/81de6346606bead19d2aacb52bb0d504cadbea04/api/spfx-template-api/src)
- [React Copilot template](https://github.com/SharePoint/spfx/tree/81de6346606bead19d2aacb52bb0d504cadbea04/templates/copilot-component-react)

## Source map

| Path | Preserved responsibility |
| --- | --- |
| `wrapper/bin/spfx.mjs` | Version/help and offline fixed-template listing; validates create arguments and forwards generation to the official CLI. |
| `wrapper/scripts/template-store.mjs` | Canonical file-map validation, exclusive extraction, link/path/hash checks, and runtime verification. |
| `wrapper/scripts/materialize-templates.mjs` | Offline package postinstall entry point. |
| `template-profile.mjs` | Records the single `template.json.spfxVersion` overlay from `1.24.0-beta.2` to `1.24.0-rc.0`. |
| `build.mjs` | Portable adaptation of the retained packaging recipe: bundles the pinned CLI/API sources, records contributing-package licenses, prepares the fixed template map and package metadata. |
| `*.test.mjs` | Extractor/profile regression tests, wrapper forwarding tests, and source/recipe checks. |

The wrapper and extractor preserve the prototype's behavior. The portable recipe
removes private completion records, machine paths, and consumer-specific names.
It uses the distinct **unpublished** name `spfx-cli-source-prototype` and version
`0.1.0-pre.3.prototype.g81de6346606b.pack.4`.
It does not reconstruct, replace, or promise byte-identical output to a
previously qualified consumer artifact. This source-preservation change does not
rebundle that historical artifact.

## Fixed behavior and boundaries

Only `copilot-component-react` is exposed. Custom template sources, alternative
templates, abbreviated/unknown flags, and duplicate create flags are rejected.
The consuming application still owns destination containment and its installation
policy. The official CLI owns project generation.

The template transport preserves all 26 files, including `.gitignore` and
`.npmignore`, which cannot safely be shipped as a nested raw tree through
`npm pack`. Exactly one metadata value is changed: `spfxVersion` targets
`1.24.0-rc.0`; the other 25 source files remain byte-identical. The package records
both metadata hashes. No generated `package.json` is rewritten.

`@microsoft/spfx-heft-plugins@1.24.0-rc.0` is an ordinary, exact **external**
dependency, not bundled code. The pinned API source originally depends on
`1.23.2`; the derivative used the official release candidate for its Node 24
engine declarations. Its `FILE_LOADER_EXTENSIONS` export adds `zip` while
preserving classification for every file in the fixed React template.
No implementation from that dependency is copied or replaced here.

The extractor deliberately uses Node built-ins: it validates strict generated
JSON rather than user JSON-with-comments, needs exclusive `wx` creation and link
checks, and runs before application dependencies can be assumed available.
Build-time code uses `@rushstack/node-core-library`.

## Source-only checks

Use Node `>=24.15.0 <25.0.0`. The recipe is independent of the Rush workspace;
install its pinned tools in this directory, not in a Rush project:

```powershell
Set-Location common\tools\spfx-cli-prototype
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The tests do not bundle or install the derivative. They use disposable fixtures,
the committed public template files, and a clearly marked forwarding-only CLI
fixture. They make no network or tenant calls.

## Portable build and local qualification recipe

The source-preservation branch contains the recipe, while a **separate disposable
checkout** must remain at the pinned upstream commit. The script checks its exact
HEAD and clean status. Set the following variables to your own absolute paths;
none are embedded in emitted manifests:

```powershell
$Recipe = (Resolve-Path common\tools\spfx-cli-prototype).Path
$Source = '<disposable-checkout-at-81de6346606bead19d2aacb52bb0d504cadbea04>'
$Output = '<new-output-directory-outside-the-source-checkout>'
```

In `$Source`, follow the repository's documented setup and run:

```powershell
Set-Location $Source
$env:RUSH_GLOBAL_FOLDER = "$Source\common\temp\rush-global"
node common\scripts\install-run-rush.js install --to @microsoft/spfx-template-test --max-install-attempts 1
node common\scripts\install-run-rush.js test --to @microsoft/spfx-cli --parallelism 2
node common\scripts\install-run-rush.js build --to @microsoft/spfx-template-test --parallelism 2
Set-Location tests\spfx-template-test
node_modules\.bin\heft.cmd test --test-path-pattern templates.test --test-name-pattern copilot-component-react --max-workers 2
```

Do not run setup in a primary checkout: Rush may install worktree Git hooks.
Do not bypass identity, lock, TLS, engine, or script-approval policies. Use the
normal package-manager prompts/policies required by your environment.

Prepare and pack locally:

```powershell
node "$Recipe\build.mjs" $Source $Output
Set-Location "$Output\package"
npm pack --ignore-scripts --json --pack-destination $Output
```

The recipe does not publish or start a service. Its output includes a relative
module graph, actual contributing-package license texts, file hashes, source and
restored Rush locks, and the packaging-tool lock. Confirm that the only
non-built-in runtime external is `@microsoft/spfx-heft-plugins`.
Record the tarball's SHA-256 and the SHA-512 integrity returned by `npm pack`.
Treat new output as a new local artifact requiring its own qualification.

For installation validation, use a new consumer folder, copy the tarball there
as `artifact.tgz`, and create a private package manifest depending on
`"spfx-cli-source-prototype": "file:artifact.tgz"`. Generate a real lock and install:

```powershell
npm install --package-lock-only --ignore-scripts --engine-strict --omit-lockfile-registry-resolved=true --no-audit --no-fund
npm ci --engine-strict --ignore-scripts=false --foreground-scripts --no-audit --no-fund
node_modules\.bin\spfx.cmd --version
node_modules\.bin\spfx.cmd list-templates
node_modules\.bin\spfx.cmd create --template copilot-component-react --component-name "Prototype Example" --target-dir .\example --package-manager none
```

Approve the dependency postinstall through your environment's normal process if
required. An existing template directory or missing/tampered extracted files fail
closed; use fresh installation generations, not repeated postinstall over an
existing tree. Verify all installed template bytes against the file map, confirm
all six generated direct SPFx packages target `1.24.0-rc.0`, and use
`npm ci --engine-strict` plus `npm run build` in the generated project before
claiming a newly built package is qualified.

These steps are a portable recipe, **not** a claim that arbitrary future registry
resolution, machines, or generated builds have already passed. Retain the actual
consumer lock and results for each run. Do not use `--force` or rewrite engine
metadata to hide incompatibilities.

## Licensing and excluded material

The packaging sources here are Copyright Bert Jansen, Apache-2.0; see `LICENSE`.
Original CLI/API/template files retain Microsoft's MIT license.
The external SPFx package has its
[own Microsoft terms](https://aka.ms/spfx/license); its normal installation is
subject to those terms. License inventory is not redistribution permission.

No historical tarballs, generated bundles, installed dependencies, caches,
private application integration source, internal evidence, tenant information,
or machine-specific diagnostics are committed here. Specifications should link
to these committed source paths and the upstream commit, not local artifacts or
session directories.
