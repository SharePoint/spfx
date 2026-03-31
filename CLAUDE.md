# Claude Development Guide for SPFx Repository

This document contains important information for Claude (AI assistant) when working with this repository.

## Prerequisites

### Node.js Version Management

This repository requires **Node.js 22.14.0 or later** (but < 23.0.0) as specified in `rush.json`.

**IMPORTANT**: This system uses **nvs** (Node Version Switcher) to manage Node.js versions.

To switch to the correct Node.js version:

```bash
# Check installed versions
nvs ls

# Link the correct version (22.21.1 is installed)
nvs link 22.21.1

# For Claude's bash commands, always export PATH first:
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
```

**Why this is needed**: The system may have an older Node.js version (e.g., v18.20.6) in the default PATH. Rush will fail if the wrong Node version is used. Always prepend the nvs Node path to PATH at the beginning of any bash command that runs rush or npm commands.

### Required Tools

- Rush (installed via npm)
- pnpm (managed by Rush)
- nvs (Node Version Switcher)

## Building the Repository

### Full Clean Build

To perform a complete clean reinstall and rebuild:

```bash
# Switch to correct Node version
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"

# Remove all node_modules and temp files
rush purge

# Install all dependencies
rush update

# Build all projects
rush build
```

### Incremental Build

```bash
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
rush build
```

### Building a Single Project

```bash
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
cd examples/webpart-minimal
rushx build
```

## Common Issues

### Issue: "Node.js version does not meet the requirements"

**Problem**: Rush fails with error about Node.js version not meeting requirements.

**Solution**: The system is using the wrong Node.js version. Always export the nvs Node path:

```bash
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
```

This must be done at the start of every bash command that uses rush or node.

### Issue: Missing peer dependencies for @types/react

**Problem**: After installation, pnpm warns about missing peer dependencies:
- `@types/react`
- `@types/react-dom`

**Solution**: This is expected and not a problem. The Microsoft SPFx packages require these as peer dependencies, but the project uses `strictPeerDependencies: false` in `pnpm-workspace.yaml` to allow builds without them. This is intentional for the "minimal" (no-framework) template.

### Updating Jest snapshots

**When to use:** After making intentional changes to CLI help text, terminal output, or any
behavior captured in `.snap` files (e.g., adding a new CLI action).

**Command** (run from the project directory, e.g. `apps/spfx-cli/`):

```bash
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
node_modules/.bin/heft test --clean -u
```

The `-u` flag is a native heft argument that passes `--updateSnapshot` to Jest. Do **not** use
`rushx build -- -u` — the `--` separator is not supported by heft and will fail.

### Issue: nvs use command fails

**Problem**: Running `nvs use 22.21.1` fails with "The 'use' command is not available when invoking this script as an executable"

**Solution**: In bash/Git Bash, use `nvs link` instead and manually update PATH:

```bash
nvs link 22.21.1
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
```

## Repository Structure

- `apps/spfx-cli/` - SPFx CLI tool
- `templates/` - Template definitions (used to generate new projects)
- `examples/` - Example implementations of templates
- `api/` - API definitions
- `tests/` - Test projects
- `tools/` - Build tools and rigs

## Templates vs Examples

- **Templates** (in `templates/`): Use EJS syntax with variables like `<%= componentNameCamelCase %>`
- **Examples** (in `examples/`): Concrete implementations that demonstrate the template output

Templates and examples must stay in sync - any changes to a template should be reflected in its corresponding example.

## Change Logs (rush change)

If a PR modifies a **published** project (`apps/spfx-cli/` or `api/spfx-template-api/`), CI will fail unless a change file exists. Both packages use the **lockstep version policy** with `@microsoft/spfx-cli` as the main project, so **always create the change file under `common/changes/@microsoft/spfx-cli/`** regardless of which package was changed. File name: `<description>_<date>.json`:

```json
{
  "changes": [
    {
      "packageName": "@microsoft/spfx-cli",
      "comment": "Brief description of the change",
      "type": "none"
    }
  ],
  "packageName": "@microsoft/spfx-cli"
}
```

**Change types:** `"none"` (devDep/config changes), `"patch"` (bug fix), `"minor"` (new feature). Do not use `"major"` — we are pre-1.0 so the max bump is `"minor"`.

**NOTE:** We have not shipped the initial release yet. Until then, always use `"none"` with an empty `"comment"` so the only changelog entry will be "Initial release."

## Git Workflow

- Main branch: `main`
- Feature branches follow pattern: `<username>/<feature-name>`
- Commit messages should be concise and descriptive
- Always include Co-Authored-By line for Claude commits

## Pull Requests

When creating a PR, follow the template in `.github/PULL_REQUEST_TEMPLATE.md`:
- **Description**: Explain what the PR does and why
- **How was this tested**: Describe how you verified the changes (e.g., `rushx build`, `rushx test`, manual testing)
- **Type of change**: Check the applicable box (bug fix, new feature, template change, docs/CI)

## Filing Issues

When filing issues, use the appropriate template from `.github/ISSUE_TEMPLATE/`:
- **Bug report**: Include reproduction steps, expected vs actual behavior, CLI/Node versions, and the affected template if applicable
- **Feature request**: Include a description, use case, and alternatives considered

## README Maintenance

The two published packages each have a README that is displayed on NPM:

- `apps/spfx-cli/README.md`
- `api/spfx-template-api/README.md`

**Whenever you make a change to a published package, update its README to reflect the change.** This includes:

- New CLI flags or changed flag behavior → update the `spfx-cli` README flag tables and examples
- New or removed templates → update the templates table in the `spfx-cli` README
- New exported classes, types, or functions → update the API reference table in the `spfx-template-api` README
- Changed usage patterns or render context fields → update code examples in the `spfx-template-api` README
- Changed Node.js version requirements → update the requirements line in both READMEs

These READMEs are written for NPM viewers — keep them practical and example-driven. Do not add internal monorepo details or contributor instructions.

## Coding Standards

These coding standards reflect the project's established conventions and must be followed exactly.

### Use `@rushstack/node-core-library` Instead of Raw Node.js APIs

This is the single most important coding convention in this repo. **Never** use raw `fs`, `path.join`, `JSON.parse`, or `child_process` when a `node-core-library` utility exists. **Prefer async filesystem operations** (`readFileAsync`, `writeFileAsync`, `readFolderItemsAsync`) over their sync counterparts.

| Instead of | Use |
|---|---|
| `fs.readFile(p)` / `fs.readFileSync(p)` | `FileSystem.readFileAsync(p)` |
| `fs.readFile(p)` (binary) | `FileSystem.readFileToBufferAsync(p)` |
| `fs.readdir(p)` / `fs.readdirSync(p)` | `FileSystem.readFolderItemsAsync(p)` |
| `fs.writeFile(p, data)` / `fs.writeFileSync(p, data)` | `FileSystem.writeFileAsync(p, content, { ensureFolderExists: true })` |
| `(error as any)?.code !== 'ENOENT'` | `FileSystem.isNotExistError(error)` |
| `JSON.parse(text)` | `JsonFile.parseString(text)` (preserves comments via `jju`) |
| `JSON.stringify(obj)` | `JsonFile.updateString(original, obj)` (preserves comments and formatting) |
| `path.join(a, b, c)` | `` `${a}/${b}/${c}` `` (template strings — faster, works on Windows) |
| `path.relative(a, b).replace(/\\/g, '/')` | `Path.convertToSlashes(path.relative(a, b))` |
| `child_process.spawn(...)` | `Executable.spawn(...)` or `Executable.spawnSync(...)` |
| `const pkg = require('../package.json')` | `import pkg from '../package.json'` (enable `resolveJsonModule` in the rig) |

**Why**: `JsonFile.parseString` uses `jju` under the hood. If a developer puts a comment in their `config.json` (which SPFx has always allowed), raw `JSON.parse` will throw. `FileSystem` also handles edge cases (encodings, newlines, folder creation) that raw `fs` does not.

### Use `import` Instead of `require()`

Always use static `import` statements. Never use `require()` for JSON files — use `import pkg from '../package.json'` with `resolveJsonModule` enabled in the rig (not in individual project tsconfigs). For package version access:

```ts
// WRONG
const CLI_VERSION: string = (require('../../../package.json') as { version: string }).version;

// RIGHT
import packageJson from '../../../package.json';
const CLI_VERSION: string = packageJson.version;
```

### Import Types from Existing Packages — Never Duplicate

**Type duplication is a bad practice**, especially for complex types. Import types from their source packages:

| Type | Import from |
|---|---|
| `IConfigJson` | `@microsoft/spfx-heft-plugins` |
| `IServeJson` (`_ISpfxServe`) | `@microsoft/spfx-heft-plugins` |
| `IPackageJson` | `@rushstack/node-core-library` |
| `IPackageSolutionJson` | `@microsoft/spfx-heft-plugins` |

Similarly, import shared constants (like `BINARY_EXTENSIONS`) from their source module rather than maintaining "keep in sync" comments.

### Template Strings Over `path.join`

Use template literals for path construction. `path.join` is slow and provides no benefit when paths are known to use forward slashes:

```ts
// WRONG
const filePath = path.join(tempDir, 'config', 'package-solution.json');

// RIGHT
const filePath = `${tempDir}/config/package-solution.json`;
```

### TypeScript Patterns

- **Prefer `interface` + factory function over `class`** when there is no behavior (no methods that use `this`). For example, `CasedString` should be an `ICasedString` interface with a `createCasedString()` factory.
- **Avoid ad-hoc `instanceof` checks for domain types** — they are expensive. Prefer discriminated unions or explicit `kind` fields, and track types through the data flow when you control construction. `instanceof Error` for error narrowing is fine.
- **Use `Map` over object records** for dynamic key/value data. Maps are more performant.
- **Use `IRequiredCommandLineChoiceParameter<T>`** for required choice parameters to avoid runtime casts.
- **Prefer `T | undefined` with `?.`** over definite assignment assertions (`!:`). Use optional chaining:
  ```ts
  // WRONG
  private _button!: HTMLButtonElement;
  this._button.removeEventListener('click', handler);

  // RIGHT
  private _button: HTMLButtonElement | undefined;
  this._button?.removeEventListener('click', handler);
  ```
- **Always use `override` keyword** on overridden methods:
  ```ts
  protected override async onExecuteAsync(): Promise<void> { ... }
  ```
- **Use `async`/`await`** instead of `.then()` chains.
- **Don't use `!!` for boolean coercion** — just use `if (value)` directly.

### Code Organization

- **Extract shared parameters into base classes.** If two CLI actions share parameters (e.g., `--local-source`, `--remote-source`, `--spfx-version`), put them in a shared base class. Don't duplicate between `CreateAction` and `ListTemplatesAction`.
- **Use standalone functions instead of private methods** when the function doesn't need `this`. Make it a module-level function.
- **Reference parameter long names from definitions** — don't repeat string literals:
  ```ts
  // WRONG
  terminal.writeWarningLine('--spfx-version is ignored when --local-template is specified.');

  // RIGHT
  terminal.writeWarningLine(
    `${this._spfxVersionParameter.longName} is ignored when ${this._localSourceParameter.longName} is specified.`
  );
  ```
- **Shared test constants** go in a shared constants file to be reused across test files.
- **Config belongs in the rig**, not in individual projects. Don't add `resolveJsonModule`, `staticAssetsToCopy`, or similar settings to individual `tsconfig.json` files when the rig should own them.
- **Consider async-loading heavy dependencies** (like `cli-table3`) in CLI actions.

### Test Conventions

- **Use `toMatchSnapshot()`** for complex output assertions. Prefer snapshots over inline assertions for JSON structures, terminal output, and merge results. Use inline snapshots (`toMatchInlineSnapshot()`) when you want the value in the test file.
- **Use `ClassName.name` in describe blocks** for refactor safety:
  ```ts
  describe(SPFxTemplateWriter.name, () => {
    describe(SPFxTemplateWriter.prototype.addMergeHelper.name, () => {
  ```
- **Use jest mocks that auto-reset** instead of manual cleanup like `delete process.env.X`. Use `jest.replaceProperty()` or mock the env object.
- **Mock network calls** — never wait for real network timeouts in tests.
- **Include snapshot tests for terminal output** when testing CLI actions.
- **Configure template folders as inputs** in `rush-project.json` for test phases that depend on them.

### Template and Example Standards

- **Sort `dependencies` and `devDependencies` alphabetically** in `package.json`.
- **Don't include direct dependencies that come from the rig** (e.g., `css-loader`, `@typescript-eslint/parser`, `@types/webpack-env`, `@types/heft-jest`, `@microsoft/spfx-heft-plugins`).
- **Remove config files that are redundant with `rig.json`** (e.g., `config/sass.json`, `config/typescript.json` when their values are defaults).
- **Localize hardcoded UI strings** using the `loc/` pattern.
- **Use `import` for images**, not `require()`.
- **`.scss.ts` and `images.d.ts` files** should be generated by Heft plugins, not checked into the repo.
- **`.npmignore` should exclude `*.test.*` files** and be comprehensive.
- **Use descriptive dummy GUIDs in CI mode** — all `1`s, `2`s, and `3`s (e.g., `11111111-1111-1111-1111-111111111111`) to make it obvious they're not real values.

### JSDoc Style

Use `@remarks` for additional context in JSDoc:

```ts
/**
 * Present only when `outcome` is `'merged'`.
 */
// WRONG — use @remarks for supplementary info:

/**
 * @remarks
 * Present only when `outcome` is `'merged'`.
 */
// RIGHT
```

### Error Handling

- **Collect and report all errors at once** instead of throwing on the first one, when validating multiple fields (e.g., package.json dependency conflicts).
- **Be context-aware in error messages** — reference the specific package name (`@microsoft/spfx-cli` vs `@microsoft/spfx-template-api`) based on how the API is being invoked.

### Merge Logic

- **Don't create empty objects** for properties that aren't defined in either source during JSON merges. Check for existence before including:
  ```ts
  // WRONG — creates empty objects for missing properties
  const merged = { bundles: {}, localizedResources: {}, externals: {}, ...existing, ...incoming };

  // RIGHT — only include properties that exist
  const merged: Partial<IConfigJson> = { ...existing, ...incoming };
  ```

### Change Log Discipline

- All change files go under `common/changes/@microsoft/spfx-cli/` — **never** create a separate change file for `@microsoft/spfx-template-api` (its version is driven by the CLI package).
- Pre-1.0: always use `"type": "none"` with `"comment": ""`.

## Important Notes

1. **Always use the correct Node version** - This is the #1 cause of build failures
2. **Rush manages dependencies** - Don't run npm/pnpm directly in project folders
3. **Peer dependency warnings are OK** - The SPFx packages have peer deps we intentionally don't install
4. **Templates must match examples** - Keep them synchronized
5. **READMEs must stay current** - Update `apps/spfx-cli/README.md` and `api/spfx-template-api/README.md` whenever the published packages change
