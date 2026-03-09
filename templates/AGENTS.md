# SPFx Template Development

Follow the style guide at [common/docs/template-style-guide.md](../common/docs/template-style-guide.md).

Key rules for AI agents working on templates:

- Templates use EJS syntax (`<%= variableName %>`)
- Use the correct variable case: `componentNameAllCaps` for string IDs, `componentNameHyphenCase` for localization keys, `componentNameCapitalCase` for class names, `componentNameCamelCase` for file/folder names
- Use `<%= description %>` for user descriptions — never generic placeholder text
- Use `<%= spfxVersion %>` for all version references — never hardcode
- Never hand-edit examples — edit the template and regenerate
- Reference implementation: `webpart-minimal`

All standard name variants (`componentNameCamelCase`, `componentNameHyphenCase`, `componentNameCapitalCase`, `componentNameAllCaps`, etc.) are built-in and automatically available in every template. If you need a custom template variable beyond the built-ins, add it to the `parameters` field in template.json:

```json
{
  "parameters": {
    "myCustomVar": {
      "type": "string",
      "description": "A custom variable",
      "required": true
    }
  }
}
```

Users pass custom parameters via `--param myCustomVar=value` on the CLI.
