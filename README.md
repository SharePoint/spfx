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

## Contributing

This repo welcomes contributions and suggestions. Please read our [Contributing Guide](CONTRIBUTING.md) for development setup, workflow, and submission guidelines.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
