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

If a PR modifies a **published** project (`apps/spfx-cli/` or `api/spfx-template-api/`), CI will fail unless a change file exists. Create one at `common/changes/@microsoft/<package-short-name>/<description>_<date>.json`:

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

## Important Notes

1. **Always use the correct Node version** - This is the #1 cause of build failures
2. **Rush manages dependencies** - Don't run npm/pnpm directly in project folders
3. **Peer dependency warnings are OK** - The SPFx packages have peer deps we intentionally don't install
4. **Templates must match examples** - Keep them synchronized
5. **READMEs must stay current** - Update `apps/spfx-cli/README.md` and `api/spfx-template-api/README.md` whenever the published packages change
