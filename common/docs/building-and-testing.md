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
rushx test
```

## How Template Snapshot Testing Works

The test suite uses a **golden-master snapshot** approach:

1. For each template, the test scaffolds a project using `spfx create` into a temp directory (`common/temp/examples/<template-name>/`).
2. It compares the scaffolded output **file-by-file** against the committed example in `examples/<template-name>/`.
3. Binary files (images, fonts) and build artifacts are excluded from comparison. Line endings are normalized.
4. If any file differs — or a file is missing/extra — the test fails.

This means the `examples/` directories are the source of truth. Any template change that alters output will be caught automatically.

## Updating Snapshots

When you intentionally change a template, regenerate the examples:

```bash
cd tests/spfx-template-test
npm test -- --update
```

The `--update` (or `-u`) flag scaffolds templates directly into `examples/` instead of the temp directory, skipping comparison. This regenerates all snapshots at once.

After updating, review the diff to make sure only your intended changes are present, then commit the updated examples alongside your template changes.

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
