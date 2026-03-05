# Creating a New Template

## Overview

Templates live in `templates/` and each has a corresponding generated example in `examples/`. The example is the rendered output of the template with concrete values substituted for EJS variables.

**Never hand-edit examples** — they are generated from templates and will be overwritten.

## Template Structure

A template directory contains:

- `template.json` — manifest with metadata, context variables, and their schemas
- Source files using EJS syntax (`<%= variableName %>`) for dynamic content

See [`templates/AGENTS.md`](../../templates/AGENTS.md) for the full variable reference and style guide.

## Workflow

1. **Create or edit** files in `templates/<your-template>/`.
2. **Regenerate the example** by re-scaffolding the template into `examples/<your-template>/` using the CLI.
3. **Verify the build**:
   ```bash
   rush build
   ```
4. **Run tests** to confirm everything matches:
   ```bash
   cd tests/spfx-template-test
   rushx build
   ```

## Registering a New Template

If you're adding a brand-new template (not editing an existing one):

1. Add the example project to `rush.json` in the `projects` array.
2. Add a test entry in `tests/spfx-template-test/src/tests/templates.test.ts` with the template name, component name, and other scaffolding parameters.
3. Run `rush update` to pick up the new project.

## Common Template Variables

| Variable | Case | Use for |
|----------|------|---------|
| `componentName` | original | Display name |
| `componentNameCamelCase` | camelCase | File/folder names |
| `componentNameCapitalCase` | PascalCase | Class names |
| `componentNameHyphenCase` | kebab-case | CSS classes, IDs, localization keys |
| `componentNameAllCaps` | UPPER_CASE | String literal IDs |
| `description` | — | User-provided description |
| `spfxVersion` | — | SPFx framework version |

See [`templates/AGENTS.md`](../../templates/AGENTS.md) and [`examples/AGENTS.md`](../../examples/AGENTS.md) for the full style guide, naming conventions, and common mistakes checklist.
