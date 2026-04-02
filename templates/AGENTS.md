# SPFx Template Development

Follow the style guide at [common/docs/template-style-guide.md](../common/docs/template-style-guide.md).

## Built-in context variables

Every template automatically receives 10 built-in variables from `buildBuiltInContext()` — templates do **not** need to declare these anywhere. The variables are:

| Variable | Description | Example |
|----------|-------------|---------|
| `componentName` | Display name | "Hello World" |
| `componentAlias` | Manifest alias (defaults to componentName) | "Hello World" |
| `componentDescription` | Description (defaults to "{name} description") | "Hello World description" |
| `libraryName` | npm package name | "@contoso/hello-world" |
| `solution_name` | Kebab-cased solution folder name | "hello-world" |
| `spfxVersion` | SPFx version from template manifest | "1.22.2" |
| `spfxVersionForBadgeUrl` | Version with hyphens escaped for shields.io | "1.22.2" |
| `componentId` | Component GUID | random or deterministic in CI |
| `featureId` | Feature GUID | random or deterministic in CI |
| `solutionId` | Solution GUID | random or deterministic in CI |

Every string value is also wrapped with casing helpers: `.camel`, `.pascal`, `.hyphen`, `.allCaps`.

## Key rules for AI agents working on templates

- Templates use EJS syntax (`<%= variableName %>`)
- Use the correct variable case: `.allCaps` for registry IDs, `.hyphen` for bundle keys, `.pascal` for class names and localization modules, `.camel` for folder names and CSS classes
- Use `<%= description %>` for user descriptions — never generic placeholder text
- Use `<%= spfxVersion %>` for all version references — never hardcode
- Never hand-edit examples — edit the template and regenerate
- Reference implementation: `webpart-minimal`
