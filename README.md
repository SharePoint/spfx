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
| [@microsoft/spfx-cli-build-rig](tools/spfx-cli-build-rig) | Tool | Shared Heft build configuration for the monorepo |
| [@microsoft/spfx-template-test](tests/spfx-template-test) | Test | Validates that templates generate expected output |

### Templates

Each template has a corresponding example showing its generated output.

| Component Type | Flavor | | |
|----------------|--------|-|-|
| Web Part | Minimal | [Template](templates/webpart-minimal) | [Example](examples/webpart-minimal) |
| Web Part | No Framework | [Template](templates/webpart-noframework) | [Example](examples/webpart-noframework) |
| Web Part | React | [Template](templates/webpart-react) | [Example](examples/webpart-react) |
| Application Customizer | — | [Template](templates/extension-application-customizer) | [Example](examples/extension-application-customizer) |
| Field Customizer | Minimal | [Template](templates/extension-fieldcustomizer-minimal) | [Example](examples/extension-fieldcustomizer-minimal) |
| Field Customizer | No Framework | [Template](templates/extension-fieldcustomizer-noframework) | [Example](examples/extension-fieldcustomizer-noframework) |
| Field Customizer | React | [Template](templates/extension-fieldcustomizer-react) | [Example](examples/extension-fieldcustomizer-react) |
| Form Customizer | No Framework | [Template](templates/extension-formcustomizer-noframework) | [Example](examples/extension-formcustomizer-noframework) |
| Form Customizer | React | [Template](templates/extension-formcustomizer-react) | [Example](examples/extension-formcustomizer-react) |
| List View Command Set | — | [Template](templates/extension-listviewcommandset) | [Example](examples/extension-listviewcommandset) |
| Search Query Modifier | — | [Template](templates/extension-search-query-modifier) | [Example](examples/extension-search-query-modifier) |
| Adaptive Card Extension | Data Visualization | [Template](templates/ace-data-visualization) | [Example](examples/ace-data-visualization) |
| Adaptive Card Extension | Generic Card | [Template](templates/ace-generic-card) | [Example](examples/ace-generic-card) |
| Adaptive Card Extension | Generic Image Card | [Template](templates/ace-generic-image-card) | [Example](examples/ace-generic-image-card) |
| Adaptive Card Extension | Generic Primary Text Card | [Template](templates/ace-generic-primarytext-card) | [Example](examples/ace-generic-primarytext-card) |
| Adaptive Card Extension | Search Card | [Template](templates/ace-search-card) | [Example](examples/ace-search-card) |
| Library | — | [Template](templates/library) | [Example](examples/library) |

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

Please read our [Contributing Guide](.github/CONTRIBUTING.md) for details on development setup and how to submit contributions.

This repo welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This repo has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.