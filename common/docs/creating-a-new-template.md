# Creating a New Template

## Overview

Templates live in `templates/` and each has a corresponding generated example in `examples/`.

Examples serve as:
- **Test fixtures** — the snapshot tests compare scaffolded output against committed examples
- **Reference implementations** — showing what the template generates with concrete values
- **Documentation** — demonstrating how components should be structured

**Templates are the source of truth.** Never hand-edit examples — edit the template and regenerate.

## Template Structure

A template directory contains:

- `template.json` — manifest with metadata, context variables, and their schemas
- Source files using EJS syntax (`<%= variableName %>`) for dynamic content

See the [Template Style Guide](template-style-guide.md) for variable reference, naming conventions, and the pre-submit checklist.

## Workflow

1. **Create or edit** files in `templates/<your-template>/`.
2. **Regenerate the example** by re-scaffolding the template into `examples/<your-template>/` using the CLI.
3. **Review the diff** — verify only your intended changes are present, no accidental hand-edits, and no template syntax (`<%= %>`) remains in the output.
4. **Verify the build**:
   ```bash
   rush build
   ```
5. **Run tests** to confirm the example matches:
   ```bash
   cd tests/spfx-template-test
   rushx build
   ```
6. **Submit both template and example changes** in the same PR.

### Fixing an issue in an example

If you find a bug in an example, don't fix the example directly:

1. Fix the template
2. Regenerate the example
3. Submit both changes together

This keeps templates as the source of truth and prevents drift.

## Registering a New Template

If you're adding a brand-new template (not editing an existing one):

1. Add the example project to `rush.json` in the `projects` array. Examples follow the naming convention `examples-<template-name>`.
2. Add a test entry in `tests/spfx-template-test/src/tests/templates.test.ts` with the template name, component name, and other scaffolding parameters.
3. Ensure the example `package.json` scripts include explicit phased entries: `_phase:build`, `_phase:test`, and `_phase:package-solution`. Note that these will be stripped out when the template is scaffolded outside of this repo.
4. Run `rush update` to pick up the new project.

## Common Template Variables

Every string value in the render context is automatically wrapped with casing helpers. Access any casing via dot notation:

| Syntax | Case | Use for |
|--------|------|---------|
| `componentName` | original | Display titles in manifests (via `toString()`) |
| `componentName.camel` | camelCase | Folder names, CSS classes, file-path segments |
| `componentName.pascal` | PascalCase | Class names, localization module keys, file names |
| `componentName.hyphen` | hyphen-case | Bundle IDs in config.json, deploy containers, webpack chunk names |
| `componentName.allCaps` | UPPER_SNAKE_CASE | ACE view/quick-view registry IDs, string constants |
| `description` | — | User-provided description |
| `spfxVersion` | — | SPFx framework version |

See the [Template Style Guide](template-style-guide.md) for the full naming conventions, rendered example requirements, and pre-submit checklist.
