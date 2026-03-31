# @microsoft/spfx-cli

> **Pre-release:** APIs and commands may change before the stable 1.0 release.

The official CLI for scaffolding [SharePoint Framework (SPFx)](https://aka.ms/spfx) projects.

```bash
npm install -g @microsoft/spfx-cli
```

**Requires Node.js `>=22.14.0 <23.0.0` or `>=24.12.0 <25.0.0`**

---

## Quick start

```bash
spfx create \
  --template webpart-react \
  --library-name my-spfx-library \
  --component-name "Hello World"
```

This downloads the `webpart-react` template from the [SharePoint/spfx](https://github.com/SharePoint/spfx) template repository and scaffolds a React-based web part into a `hello-world` subfolder.

---

## `spfx create`

Scaffolds a new SPFx component. Templates are pulled from the [SharePoint/spfx](https://github.com/SharePoint/spfx) GitHub repository by default.

### Required flags

| Flag | Description |
|------|-------------|
| `--template NAME` | Template to use (see [Templates](#templates) below) |
| `--library-name NAME` | npm library name for the component (e.g. `my-spfx-lib`) |
| `--component-name NAME` | Display name of the component (e.g. `"Hello World"`) |

### Optional flags

| Flag | Default | Description |
|------|---------|-------------|
| `--target-dir PATH` | `./<solution-name>` | Directory to scaffold into (derived from solution name when omitted) |
| `--solution-name NAME` | hyphen-cased component name | SharePoint solution name |
| `--component-alias ALIAS` | same as `--component-name` | Short identifier for the component |
| `--component-description TEXT` | `"<name> description"` | Component description string |
| `--spfx-version VERSION` | `version/latest` branch | SPFx version to use; resolves to the `version/<VERSION>` branch (e.g. `1.22`, `1.23-rc.0`) |
| `--template-url URL` | `https://github.com/SharePoint/spfx` | Custom GitHub template repository |
| `--local-source PATH` | — | Path to a local template folder (repeatable) |
| `--remote-source URL` | — | Public GitHub repo to include as an additional template source (repeatable) |

### Environment variables

| Variable | Description |
|----------|-------------|
| `SPFX_TEMPLATE_REPO_URL` | Equivalent to `--template-url` |
| `GITHUB_TOKEN` | GitHub personal access token — required for GitHub Enterprise hosts, also works for private repos on github.com |
| `SPFX_CI_MODE=1` | Internal/testing-only: produces deterministic UUIDs for CI; not shown in `--help`; subject to change |

---

## `spfx list-templates`

Lists all available templates from configured sources. The default GitHub source is always included; use `--local-source` and `--remote-source` to add more.

```bash
spfx list-templates
```

### Optional flags

| Flag | Default | Description |
|------|---------|-------------|
| `--spfx-version VERSION` | `version/latest` branch | Branch/tag in the default template repo to use (e.g. `1.22`, `1.23-rc.0`) |
| `--template-url URL` | `https://github.com/SharePoint/spfx` | Custom GitHub template repository (default source) |
| `--local-source PATH` | — | Path to a local template folder to include (repeatable) |
| `--remote-source URL` | — | Additional public GitHub repo to include as a template source (repeatable) |

### Environment variables

| Variable | Description |
|----------|-------------|
| `SPFX_TEMPLATE_REPO_URL` | Equivalent to `--template-url` |
| `GITHUB_TOKEN` | GitHub personal access token — required for GitHub Enterprise hosts, also works for private repos on github.com |

### Examples

Include a local template folder alongside the default source:

```bash
spfx list-templates --local-source ./my-templates
```

Include an additional GitHub repository:

```bash
spfx list-templates --remote-source https://github.com/my-org/my-templates
```

Target a specific SPFx version branch:

```bash
spfx list-templates --spfx-version 1.22
```

---

## Templates

Templates are fetched at runtime from the [SharePoint/spfx](https://github.com/SharePoint/spfx) GitHub repository. Use `--spfx-version` to target a specific release branch (e.g. `--spfx-version 1.22` resolves to the `version/1.22` branch), or `--local-source` to use templates from disk.

### Web Parts

| Name | Description |
|------|-------------|
| `webpart-minimal` | Bare-bones web part, no UI framework |
| `webpart-noframework` | Full web part scaffold, no UI framework |
| `webpart-react` | Web part with React and Fluent UI |

### Extensions

| Name | Description |
|------|-------------|
| `extension-application-customizer` | Application Customizer |
| `extension-fieldcustomizer-minimal` | Field Customizer, no UI framework (minimal) |
| `extension-fieldcustomizer-noframework` | Field Customizer, no UI framework |
| `extension-fieldcustomizer-react` | Field Customizer with React |
| `extension-formcustomizer-noframework` | Form Customizer, no UI framework |
| `extension-formcustomizer-react` | Form Customizer with React |
| `extension-listviewcommandset` | List View Command Set |
| `extension-search-query-modifier` | Search Query Modifier |

### Adaptive Card Extensions

| Name | Description |
|------|-------------|
| `ace-data-visualization` | Data Visualization card |
| `ace-generic-card` | Generic card |
| `ace-generic-image-card` | Generic image card |
| `ace-generic-primarytext-card` | Generic primary text card |
| `ace-search-card` | Search card |

### Other

| Name | Description |
|------|-------------|
| `library` | Shared SPFx library component |

---

## More examples

Scaffold into a specific directory:

```bash
spfx create \
  --template webpart-react \
  --library-name my-spfx-library \
  --component-name "My Dashboard" \
  --target-dir ./my-project
```

Target a specific SPFx version:

```bash
spfx create \
  --template webpart-react \
  --library-name my-spfx-library \
  --component-name "My Web Part" \
  --spfx-version 1.22
```

Use a local template (offline / custom templates):

```bash
spfx create \
  --template webpart-minimal \
  --library-name my-spfx-library \
  --component-name "My Web Part" \
  --local-source ./path/to/templates
```

Use templates from a custom GitHub repository:

```bash
spfx create \
  --template my-custom-template \
  --library-name my-spfx-library \
  --component-name "My Web Part" \
  --remote-source https://github.com/my-org/my-templates
```

Use templates from a GitHub Enterprise instance:

```bash
GITHUB_TOKEN=ghp_... spfx create \
  --template webpart-react \
  --library-name my-spfx-library \
  --component-name "My Web Part" \
  --template-url https://github.mycompany.com/org/spfx-templates
```

---

## License

MIT © Microsoft Corporation
