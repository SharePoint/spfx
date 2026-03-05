# Contributing to SPFx CLI

Thank you for your interest in contributing to the SPFx CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for details.

## Contributor License Agreement (CLA)

Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repos using our CLA.

## Reporting Issues

- Use [GitHub Issues](https://github.com/nickvdyck/spfx/issues) to report bugs and request features.
- Search existing issues before filing a new one to avoid duplicates.
- When reporting a bug, include steps to reproduce, expected behavior, and actual behavior.

## How to Contribute

1. **Fork** the repository and clone your fork locally.
2. Create a **branch** for your change (`git checkout -b my-feature`).
3. Make your changes and verify the build passes (see [Development Setup](#development-setup)).
4. **Commit** your changes with a clear, descriptive message.
5. **Push** to your fork and open a Pull Request against `main`.

Please keep PRs focused — one logical change per PR. Ensure your fork is up to date with `main` before submitting.

## Development Setup

### Prerequisites

- **Node.js** >=22.14.0 <23.0.0
- **Rush** (`npm install -g @microsoft/rush`)

### Building

Install dependencies and build all projects:

```bash
rush update
rush build
```

To build a single project:

```bash
cd examples/webpart-minimal
rushx build
```

### Running Tests

```bash
cd tests/spfx-template-test
rushx test
```

## Template Development

Templates live in `templates/` and have corresponding generated examples in `examples/`.

The workflow for template changes is:

1. Edit the template source in `templates/`.
2. Regenerate the corresponding example.
3. Verify the build: `rush build`.
4. Run tests: `cd tests/spfx-template-test && rushx test`.

**Never hand-edit examples** — they are generated from templates and will be overwritten.

See [`templates/AGENTS.md`](../templates/AGENTS.md) and [`examples/AGENTS.md`](../examples/AGENTS.md) for template style guides and conventions.

## Change Log Requirements

Change log entries are only required for the published packages:

- `@microsoft/spfx-cli` (`apps/spfx-cli/`)
- `@microsoft/spfx-template-api` (`api/spfx-template-api/`)

To create a change file, run:

```bash
rush change
```

Change types:

| Type | Use for |
|------|---------|
| `none` | Dev dependency or config-only changes |
| `patch` | Bug fixes |
| `minor` | New features |

Do not use `major` — this project is pre-1.0 so the maximum bump is `minor`.
