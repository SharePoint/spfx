<p align="center">
  <img src="common/docs/images/sharepoint-logo.png" alt="SharePoint" width="120" />
</p>

<h1 align="center">SharePoint Framework (SPFx) CLI</h1>

<p align="center">
  The modern CLI for scaffolding SharePoint Framework projects
</p>

<p align="center">
  <a href="https://github.com/SharePoint/spfx/actions/workflows/ci.yml"><img src="https://github.com/SharePoint/spfx/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@microsoft/spfx-cli"><img src="https://img.shields.io/npm/v/@microsoft/spfx-cli" alt="npm version" /></a>
  <a href="https://github.com/SharePoint/spfx/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/node-22.x_%7C_24.x-brightgreen" alt="Node.js 22.x | 24.x" />
  <img src="https://img.shields.io/badge/SPFx-1.22.2-blue" alt="SPFx 1.22.2" />
</p>

---

> **Pre-release:** This project is under active development. APIs and commands may change before the stable 1.0 release.

## What is this?

The [SharePoint Framework (SPFx)](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview) is Microsoft's extensibility model for SharePoint and Microsoft 365. This repository contains the next-generation CLI for scaffolding SPFx projects, replacing the legacy Yeoman-based generator with a modern, open-source tool.

The repo ships two packages:

- **[`@microsoft/spfx-cli`](apps/spfx-cli/README.md)** — Command-line interface for scaffolding SPFx components
- **[`@microsoft/spfx-template-api`](api/spfx-template-api/README.md)** — Programmatic API for template rendering (use this to build custom tooling)

Templates are versioned independently and fetched at runtime from this GitHub repository, so template improvements ship without requiring a CLI update.

---

## Quick start

```bash
npm install -g @microsoft/spfx-cli
```

Scaffold a React web part:

```bash
spfx create \
  --template webpart-react \
  --library-name my-spfx-library \
  --component-name "Hello World"
```

List all available templates:

```bash
spfx list-templates
```

See the [CLI README](apps/spfx-cli/README.md) for the full command reference.

---

## Templates

All templates target **SPFx 1.22.2**. Use `--spfx-version` to target a different release branch.

### Web Parts

| Template | Description |
|----------|-------------|
| [`webpart-minimal`](templates/webpart-minimal) | Bare-bones web part, no UI framework |
| [`webpart-noframework`](templates/webpart-noframework) | Full web part scaffold, no UI framework |
| [`webpart-react`](templates/webpart-react) | Web part with React and Fluent UI |

### Extensions

| Template | Description |
|----------|-------------|
| [`extension-application-customizer`](templates/extension-application-customizer) | Application Customizer |
| [`extension-fieldcustomizer-minimal`](templates/extension-fieldcustomizer-minimal) | Field Customizer, no UI framework (minimal) |
| [`extension-fieldcustomizer-noframework`](templates/extension-fieldcustomizer-noframework) | Field Customizer, no UI framework |
| [`extension-fieldcustomizer-react`](templates/extension-fieldcustomizer-react) | Field Customizer with React |
| [`extension-formcustomizer-noframework`](templates/extension-formcustomizer-noframework) | Form Customizer, no UI framework |
| [`extension-formcustomizer-react`](templates/extension-formcustomizer-react) | Form Customizer with React |
| [`extension-listviewcommandset`](templates/extension-listviewcommandset) | List View Command Set |
| [`extension-search-query-modifier`](templates/extension-search-query-modifier) | Search Query Modifier |

### Adaptive Card Extensions

| Template | Description |
|----------|-------------|
| [`ace-data-visualization`](templates/ace-data-visualization) | Data Visualization card |
| [`ace-generic-card`](templates/ace-generic-card) | Generic card |
| [`ace-generic-image-card`](templates/ace-generic-image-card) | Generic image card |
| [`ace-generic-primarytext-card`](templates/ace-generic-primarytext-card) | Generic primary text card |
| [`ace-search-card`](templates/ace-search-card) | Search card |

### Libraries

| Template | Description |
|----------|-------------|
| [`library`](templates/library) | Shared SPFx library component |

---

## Documentation & Resources

### SPFx Documentation

| Resource | Description |
|----------|-------------|
| [SPFx Overview](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview) | What is the SharePoint Framework? |
| [Set up your dev environment](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-development-environment) | Install prerequisites for SPFx development |
| [Build your first web part](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/build-a-hello-world-web-part) | Hello World tutorial |
| [Web Parts](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/overview-client-side-web-parts) | Client-side web parts overview |
| [Extensions](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/extensions/overview-extensions) | SPFx Extensions overview |
| [Viva Connections / ACEs](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/viva/overview-viva-connections) | Adaptive Card Extensions for Viva |
| [API Reference](https://learn.microsoft.com/en-us/javascript/api/overview/sharepoint?view=sp-typescript-latest) | SPFx TypeScript API reference |
| [Compatibility matrix](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility) | SPFx version compatibility table |
| [Tools and libraries](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/tools-and-libraries) | Development tools reference |
| [SPFx v1.22 release notes](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/release-1.22) | Latest release notes |

### This repository

| Resource | Description |
|----------|-------------|
| [CLI README](apps/spfx-cli/README.md) | Full command reference, flags, and examples |
| [Template API README](api/spfx-template-api/README.md) | Programmatic API for custom tooling |
| [Architecture](common/docs/spfx-cli-architecture.md) | Design decisions and system architecture |
| [Creating a new template](common/docs/creating-a-new-template.md) | Guide for template authors |
| [Template style guide](common/docs/template-style-guide.md) | Conventions for template code |

---

## Feedback & Issues

- **CLI or template bugs:** [File an issue](https://github.com/SharePoint/spfx/issues/new/choose) in this repo
- **SPFx platform issues:** [SharePoint/sp-dev-docs](https://github.com/SharePoint/sp-dev-docs/issues)
- **SharePoint developer docs:** [sp-dev-docs](https://github.com/SharePoint/sp-dev-docs)

---

## Contributing

This monorepo is managed with [Rush](https://rushjs.io) and [pnpm](https://pnpm.io). Contributions and suggestions are welcome — please read our [Contributing Guide](CONTRIBUTING.md) for submission guidelines.

To get started developing:

- [Setting up your dev environment](common/docs/setting-up-your-dev-environment.md)
- [Building and testing](common/docs/building-and-testing.md)
