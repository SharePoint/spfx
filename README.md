# SPFx CLI
SPFx CLI tool for scaffolding and managing SPFx projects.

## Projects

This monorepo is organized into the following projects:

### Published Packages (soon)

| Package Name | Type | Description |
|--------------|------|-------------|
| [@microsoft/spfx-cli](apps/spfx-cli) | Application | Command-line interface for managing SPFx projects |
| [@microsoft/spfx-template-api](api/spfx-template-api) | Library | Core scaffolding API |

### Internal Packages

| Package Name | Type | Description |
|--------------|------|-------------|
| [@microsoft/spfx-cli-build-rig](tools/build-rig) | Tool | Shared Heft build configuration for the monorepo |

## Getting Started

To get started with this monorepo, follow these steps:

1. Install dependencies:
   ```
   rush install
   ```

2. Build the projects:
   ```
   rush build
   ```

3. Explore the individual projects for more details on their usage.

## Contributor Notice

This repo welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This repo has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.