# Building and Testing

## Building

Install dependencies and build everything:

```bash
rush install
rush build
```

To build a single project:

```bash
cd examples/webpart-minimal
rushx build
```

## Running Tests

```bash
cd tests/spfx-template-test
rushx build
```

## Rush Phased Commands

This repo uses explicit Rush phases defined in `common/config/rush/command-line.json`:

- `_phase:build`
- `_phase:test`
- `_phase:package-solution`

Script expectations by project type:

- All Rush projects should define a `_phase:build` `package.json` script.
- SPFx solution projects should also define `_phase:package-solution`.
- Non-SPFx projects (for example, API/tooling packages) should not add `_phase:package-solution`.
- Projects with tests should define `_phase:test`.

When a template is scaffolded in non-CI mode, these scripts will be stripped out.

For projects where a phase does not apply but is still expected, use an empty script (`""`) as an explicit no-op.

## How Template Snapshot Testing Works

The test suite uses a **golden-master snapshot** approach:

1. For each template, the test scaffolds a project using `spfx create` into a temp directory (`common/temp/examples/<template-name>/`).
2. It compares the scaffolded output **file-by-file** against the committed example in `examples/<template-name>/`.
3. Binary files (images, fonts) and build artifacts are excluded from comparison. Line endings are normalized.
4. If any file differs — or a file is missing/extra — the test fails.

This means the `examples/` directories are the source of truth. Any template change that alters output will be caught automatically.

## Updating Snapshots

The test suite has an update mode that scaffolds templates directly into `examples/` instead of a temp directory. It is triggered by `--update` or `-u` in `process.argv`, but this flag does not currently propagate through heft/Jest workers. A fix is tracked separately.

In the meantime, if you change a template and need to regenerate examples, use the CLI directly to re-scaffold into the example directory, then verify with a test run.

## Change Log Requirements

Change files are only required when modifying **published packages**:

- `@microsoft/spfx-cli` (`apps/spfx-cli/`)
- `@microsoft/spfx-template-api` (`api/spfx-template-api/`)

To create one:

```bash
rush change
```

| Type | Use for |
|------|---------|
| `none` | Dev dependency or config-only changes |
| `patch` | Bug fixes |
| `minor` | New features |

Do not use `major` — this project is pre-1.0 so the maximum bump is `minor`.
