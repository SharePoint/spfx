# RFC: SPFx CLI Architecture

## Status

This document captures the architecture and design of the SPFx CLI and scaffolding
infrastructure. It is a living document and will be updated as the project evolves.

---

## Motivation

The existing SPFx scaffolding tool is the Yeoman generator
(`@microsoft/generator-sharepoint`). It has served the platform well, but carries
several structural problems:

- **Yeoman itself is legacy.** The project is in maintenance mode, many of its
  transitive dependencies are outdated, and the ecosystem has largely moved on.
- **Closed-source templates.** The generator's templates are bundled inside the
  closed-source generator package, which limits community feedback and contributions.
- **High support cost.** The generator has a large test matrix that is difficult to
  test manually, has correctness issues in existing automated tests, and requires a
  complex environment setup.
- **Coupled release cadence.** Template changes cannot ship without a full SPFx
  release, which slows iteration and prevents out-of-band fixes.

The vision is to replace this with an open-source, decoupled system where
templates live in a public GitHub repo, a standalone scaffolding API handles rendering
and merging, and a new CLI (or any other front-end) is a thin consumer of that API.

---

## Objectives

### For SharePoint engineering

- Ability to run CI on template changes against public SPFx versions.
- Ability to publish out-of-band changes to templates (i.e. change templates without
  doing a full SPFx release).
- Complete decoupling of scaffolding tool from SPFx releases.

### For SPFx developers

- An open-source repo with SPFx templates.
- Ability to point to a custom public GitHub repo containing custom or forked SPFx
  templates.
- A new SPFx CLI tool with a command for scaffolding.

---

## Design

### SPFx CLI

**Package:** `@microsoft/spfx-cli`
**Binary:** `spfx`

The CLI is a thin front-end over the scaffolding API. It handles argument parsing
and user-facing output, but delegates all template loading, rendering, and writing
to `@microsoft/spfx-template-api`. All flows are non-interactive — there is no prompting;
any required parameters must be supplied via flags, and optional parameters use documented
defaults when omitted.

This separation means additional front-ends (e.g. `npm create`, an MCP server, or a
Yeoman compatibility shim) can be built without duplicating core logic.

#### `spfx create`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--template TEMPLATE_NAME` | Yes | Choose the template to scaffold. |
| `--target-dir TARGET` | No | The directory where output should be written. Defaults to current working directory. |
| `--local-source PATH` | No | Path to a local template folder. Can be specified multiple times. |
| `--library-name NAME` | Yes | The library name for the component. |
| `--component-name NAME` | Yes | The display name for the component (e.g. "Hello World"). |
| `--component-alias ALIAS` | No | The component alias. Defaults to the component name. |
| `--component-description DESC` | No | The component description. Auto-generated from component name if omitted. |
| `--solution-name NAME` | No | The solution name. Defaults to the kebab-case component name. |
| `--template-url URL` | No | Custom GitHub template repository URL. Defaults to `https://github.com/SharePoint/spfx`. Also accepts the `SPFX_TEMPLATE_REPO_URL` environment variable. |
| `--spfx-version VERSION` | No | Branch/tag in the template repo to use (e.g. `1.22`, `1.23-rc.0`). Defaults to the repo's default branch. |
| `--remote-source URL` | No | Public GitHub repo to include as an additional template source. Can be specified multiple times. |
| `--package-manager {npm,pnpm,yarn,none}` | No | Package manager for dependency installation after scaffolding. `none` skips installation (default). See [#165](https://github.com/SharePoint/spfx/issues/165) for the planned restriction to new projects only. |

#### `spfx list-templates`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--local-source PATH` | No | Path to a local template folder. Can be specified multiple times. |
| `--remote-source URL` | No | Public GitHub repo to include as an additional template source. Can be specified multiple times. |
| `--template-url URL` | No | Custom GitHub template repository URL for the default source. |
| `--spfx-version VERSION` | No | Branch/tag in the default template repo to use. |

Lists all templates available from the registered sources. The default GitHub source is always included; `--local-source` and `--remote-source` add additional sources.

---

### Scaffolding API

**Package:** `@microsoft/spfx-template-api`

A proper SDK surface for downloading templates, rendering them, and writing them to
disk. The rationale for separating this into a different package is:

- **Programmatic access:** Allows any consumer a programmatic way to build their own
  generators — e.g. pulling from a custom template source, running multiple templates,
  etc., all in one script.
- **Multiple front-ends:** Arbitrary front-ends (e.g. `npm create`, a Yeoman
  compatibility shim, an MCP server) can be built without changing any core code.
- **Testability:** The API is both unit-testable and used for the public template
  repository's own CI.
- **Future extensibility:** The generic parts could later be refactored into a
  general-purpose templating engine.

#### `SPFxTemplateJsonFile`

Utility for reading and validating SPFx template definition files (`template.json`).
Each template directory contains a `template.json` with the following fields:

- **`name`** — Template name (e.g. `"webpart-minimal"`)
- **`description`** — Human-readable description
- **`version`** — Template version (semver)
- **`spfxVersion`** — Compatible SPFx version
- **`contextSchema`** (optional) — Declares the context variables the template
  expects, used for validation at render time

The schema is validated with Zod at load time.

#### `SPFxTemplate`

An in-memory encapsulation of a single SPFx template. A template consists of:

- `template.json` — the template definition (read by `SPFxTemplateJsonFile`)
- All other files:
  - Text files — treated as EJS template files
  - Binary assets — copied as-is without EJS processing

The class can be constructed from a folder on disk (`fromFolderAsync`) or from
in-memory data (`fromMemoryAsync`). It exposes a `renderAsync()` method that
processes text files through EJS with the provided context object (while copying
binary assets unchanged) and returns a rendered file set. In the current
implementation, `SPFxTemplate` also exposes a `write()` helper that the CLI
calls to persist the rendered output to disk.

> **Planned change:** `renderAsync()` will return an `ISPFxTemplateFileSet`
> interface that we define and own, rather than exposing a third-party type. A
> separate `SPFxTemplateWriter` class will be introduced to handle inspecting
> rendered output and applying merge logic before committing changes to disk.

Filenames support `{variableName}` placeholder syntax — e.g.
`src/webparts/{componentNameCamelCase}WebPart.ts` is resolved using the render
context.

#### `SPFxTemplateCollection`

A `Map<string, SPFxTemplate>` keyed by template name. Aggregates templates from
one or more sources.

#### `SPFxTemplateRepositoryManager`

Top-level utility for downloading and reading template collections from multiple
sources.

Several `BaseSPFxTemplateRepositorySource` subclasses can be registered. Initially
two flavors are supported, but this can be expanded in the future (e.g. for
authenticated repos, npm packages, Azure DevOps artifacts, etc.):

- **`LocalFileSystemRepositorySource`** — Accepts a path, reads templates from local
  disk. Primarily used for local testing and debugging.
- **`PublicGitHubRepositorySource`** — Accepts a GitHub repo URL and optional branch
  (defaults to `main`). Constructs a GitHub Codeload URL, performs an in-memory
  download and unzip of the repository. Primary path for production CLI.

**Download mechanism:** The GitHub source constructs a URL of the form:

```
https://codeload.github.com/{owner}/{repo}/zip/{ref}
```

Where `{ref}` is a branch name (e.g. `main`, `1.22`, `1.23-rc.0`) or a git commit
hash. This enables version-locked downloads and reproducible scaffolding.

#### `SPFxTemplateWriter` (planned — not yet implemented)

> **Note:** This class does not exist yet. The CLI currently calls
> `template.write()` directly. The design below describes the planned
> implementation for the "add a component to an existing project" workflow.

A public orchestration class that will manage writing rendered template output to
disk. It will accept a rendered file set and a target directory. Before committing
files, it will check `fs.existsSync()` for each file to classify it as new
(write as-is) or modified (route through a merge helper). Modified files will be
routed through specialized `MergeHelper` subclasses that perform intelligent
merging rather than blind overwriting.

This is critical for the "add a second component to an existing project" workflow,
where config files like `package.json` and `config/config.json` must be merged rather
than replaced.

**Merge helper hierarchy:**

```
BaseMergeHelper (abstract)
  fileRelativePath: string   — the relative path this helper handles
  merge(existing, new): string

  └─ JsonMergeHelper (abstract — parseJson/serializeJson helpers)
       ├─ PackageJsonMergeHelper       → "package.json"
       ├─ ConfigJsonMergeHelper        → "config/config.json"
       ├─ PackageSolutionJsonMergeHelper → "config/package-solution.json"
       └─ ServeJsonMergeHelper         → "config/serve.json"
```

**Merge strategies:**

| File | Strategy |
|------|----------|
| `package.json` | Union `dependencies` and `devDependencies`. If the new template specifies a different SPFx version than the existing project, throw an error (an upgrader is out of scope for v0). Preserve all other fields from the existing file. |
| `config/config.json` | Merge `bundles`, `localizedResources`, and `externals` by key. Preserve `$schema` and `version`. |
| `config/package-solution.json` | Append new entries to `solution.features`, deduplicate by feature `id` (GUID). Preserve all solution-level metadata. |
| `config/serve.json` | Merge `serveConfigurations` by name key. Preserve `port`, `https`, `initialPage` from existing. |

For modified files with no registered merge helper, the writer emits a warning and
falls back to overwriting. Custom merge helpers can be registered via
`addMergeHelper()`.

#### `SPFxCreationAuditLog` (future)

A structured successor to the `.yo-rc.json` file — a well-defined audit log of what
the CLI has done, what template was used, what decisions were made, etc. This file
also serves as the mechanism for detecting existing SPFx projects: when the CLI is
run in a directory that already contains an audit log, it can skip solution-level
prompts and proceed directly to adding a new component. Not yet implemented but the
design accommodates it.

---

### Example API Usage

The following illustrates how the scaffolding API is currently used
programmatically — this reflects the current API surface:

```typescript
import {
  SPFxTemplateRepositoryManager,
  LocalFileSystemRepositorySource,
  SPFxTemplateCollection,
  SPFxTemplate,
  ISPFxTemplateFileSet
} from '@microsoft/spfx-template-api';

async function scaffold(): Promise<void> {
  // Create a manager and register template sources
  const manager = new SPFxTemplateRepositoryManager();
  manager.addSource(new LocalFileSystemRepositorySource(
    '/path/to/local/templates'
  ));

  // Aggregate templates from all sources
  const templates: SPFxTemplateCollection = await manager.getTemplatesAsync();

  // Select a template
  const template: SPFxTemplate = templates.get('webpart-minimal')!;

  // Render with context variables
  const fileSet: ISPFxTemplateFileSet = await template.renderAsync(
    {
      solution_name: 'my-solution',
      componentNameCamelCase: 'helloWorld',
      componentNameCapitalCase: 'HelloWorld',
      componentNameHyphenCase: 'hello-world',
      componentNameAllCaps: 'HELLO_WORLD',
      componentId: '11111111-1111-1111-1111-111111111111',
      solutionId: '22222222-2222-2222-2222-222222222222',
      featureId: '33333333-3333-3333-3333-333333333333',
      libraryName: 'my-solution',
      componentAlias: 'helloWorld',
      componentNameUnescaped: 'Hello World',
      componentDescription: 'Hello World web part',
      spfxVersion: '1.22.1',
      nodeVersion: '>=18.17.1 <19.0.0 || >=20.0.0 <21.0.0',
    },
    '/path/to/output'
  );

  // Write to disk
  await template.write(fileSet);
}
```

---

### Template Monorepo

Templates live in the `SharePoint/spfx` repo.

Rather than making the templates themselves buildable projects (which would require
either a "buildable" templating syntax or a complex hardcoded list of string
replacements), the design follows the API-Extractor pattern: check in both the
template source and the output of running the template.

- In **dev mode**, we simply overwrite the rendered examples.
- In **CI builds**, we require that the rendered output matches exactly what is
  checked in.

A dedicated test package (`tests/spfx-template-test`) implements this validation.

#### Structure

This is a Rush monorepo with the following layout:

| Directory | Purpose |
|-----------|---------|
| `api/` | The scaffolding API (`@microsoft/spfx-template-api`) |
| `apps/` | Contains the SPFx CLI and other front-ends (e.g. MCP server, `npm create`, Yeoman shim) |
| `libraries/` | Shared internal libraries (e.g. `spfx-templating-engine`) |
| `templates/` | Raw EJS templates. **Not** registered as Rush projects. |
| `examples/` | Rendered examples generated from the templates. These **are** Rush projects (must build cleanly). |
| `tests/` | Validation tooling (template rendering tests, example build verification) |
| `tools/` | Build rigs and toolchain configuration |

#### Template directory structure

Each template is a flat directory under `templates/`:

```
templates/
  webpart-minimal/
    template.json                          ← template definition
    package.json                           ← EJS template
    config/config.json                     ← EJS template
    config/package-solution.json           ← EJS template
    config/serve.json                      ← EJS template
    src/webparts/{componentNameCamelCase}WebPart/
      {componentNameCapitalCase}WebPart.ts ← EJS template (filename has placeholders)
      ...
```

The available templates span web parts, adaptive card extensions (ACEs),
field customizers, form customizers, application customizers, list view command sets,
search query modifiers, and libraries.

#### Branching

There is a branch for every SPFx release type (including beta, RC). The CLI tool
constructs the download URL assuming the SPFx version is a branch name in the repo.
`main` always tracks the latest stable release.

For changes that need to be applied to older template versions (e.g. a security
vulnerability in an indirect dependency), the fix is cherry-picked to any affected
branch.

Templates for unreleased SPFx versions are developed in a private repo. Branches
are synced to the public repo during each SPFx release.

---

## Governance

All open-source projects at Microsoft must meet minimum governance requirements:

- CI/CD pipelines
- Release workflow (NPM publishing, branch tagging)
- Branch policies
- Contributor guidelines and PR bot
- Dependabot for dependency updates
- PR and issue templates

---

## Out of Scope

The following are explicitly out of scope for the initial release:

- **gulp-core-build support** — The legacy build system is not being carried forward.
- **Post-creation congratulations banner** — The legacy generator displayed an ASCII
  art banner after scaffolding. This will not be carried forward.

---

## Development Phases

### Phase 1 — Core Foundation (MVP)

- **Repo + monorepo setup:** Rush configuration, package layout (API, CLI, templates,
  examples).
- **Scaffolding API MVP:** `SPFxTemplateCollection`, template definition schema,
  local + GitHub sources.
- **Template monorepo baseline:** Migrate existing Yeoman templates into `/templates`
  and generate corresponding `/examples`.
- **CLI package creation** (`@microsoft/spfx-cli`):
  - `create` command (scaffold with options)

### Phase 2 — Governance & Core Functionality (GA)

- **Governance setup:** Publishing to NPM, CI/CD, branch policies, contributor guide,
  Dependabot, PR templates.
- **Pre-build validation tool:** Check rendered templates vs. checked-in examples.
- **CI coverage:** Run rendered examples against public SPFx releases. Additionally,
  validate templates against the latest internal SharePoint builds to catch regressions
  before release.
- **MergeHelpers:** Robust merge handlers (`package.json`, `config.json`,
  `package-solution.json`, `serve.json`, Teams manifest).
- **`list-templates` command.**

### Phase 3 — Stabilization & Expansion (post-GA)

- **OSS hardening:** Documentation polish, contributor workflows, PR bot setup, code
  coverage.
- **Expanded template sources:** Ensure GitHub source flexibility, package manager
  selection, SPFx version selection.
- **AuditLog MVP:** Structured `.yo-rc.json` successor.
- **Third-party enablement:** Verify external repo pointing and custom template usage,
  documentation for building custom template collections.
- **Additional front-ends (stretch):** `npm create`, MCP server prototype, Yeoman
  compatibility shim.

