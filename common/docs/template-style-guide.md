# Template Style Guide

This guide covers naming conventions, variable usage, and code quality standards for SPFx templates and their generated examples.

## Template Variable Reference

Template variables are defined in each template's `template.json` under `contextSchema`:

```json
{
  "context": {
    "spfxVersion": "1.22.2"
  }
}
```

Every string value in the render context is automatically wrapped with casing helpers. Access any casing via dot notation:

| Syntax | Case | Use for | Example |
|--------|------|---------|---------|
| `componentName` | original | Display titles in manifests (via `toString()`) | "Generic Card" |
| `componentName.camel` | camelCase | Folder names, CSS classes, file-path segments | "genericCard" |
| `componentName.pascal` | PascalCase | Class names, localization module keys, file names | "GenericCard" |
| `componentName.hyphen` | hyphen-case | Bundle IDs in config.json, deploy containers, webpack chunk names | "generic-card" |
| `componentName.allCaps` | UPPER_SNAKE_CASE | ACE view/quick-view registry IDs, string constants | "GENERIC_CARD" |
| `libraryName` | original | Package name (via `toString()`) | "@spfx-template/generic-card" |
| `description` | — | User-provided description | User's text |
| `spfxVersion` | — | SPFx framework version | "1.22.2" |

The same casing helpers are available on **any** string context variable — e.g. `componentAlias.pascal`, `libraryName.hyphen`, etc.

If you need a custom transformation, use inline EJS: `<%= componentName.toString().replace(/[^A-Z0-9]/gi, '') %>`

## Naming Conventions

### String literal IDs — ALL_CAPS

Common locations: AdaptiveCardExtension view IDs, FormCustomizer/FieldCustomizer component IDs, any `public static readonly` string constants.

```typescript
// Correct
public static readonly GENERICCARD_CARD_VIEW = 'GENERICCARD_CARD_VIEW';

// Wrong — mixed case
public static readonly GenericCard_CARD_VIEW = 'GenericCard_CARD_VIEW';
```

### Bundle identifiers — hyphen-case

Used in `config/config.json` bundle keys, `config/deploy-azure-storage.json` containers, and webpack chunk names.

```json
// Correct — config.json bundle key
"<%= componentName.hyphen %>-web-part": { ... }

// Wrong — camelCase in bundle key
"<%= componentName.camel %>WebPart": { ... }
```

### Localization modules — PascalCase

Localization module names in `config.json` `localizedResources` and `loc/*.d.ts` `declare module` statements use `.pascal`.

```json
// Correct
"<%= componentName.pascal %>WebPartStrings": "lib/webparts/<%= componentName.camel %>WebPart/loc/{locale}.js"
```

### TypeScript identifiers — camelCase / PascalCase

Use `componentName.camel` for instances and `componentName.pascal` for class names.

## Description Placeholders

Use `<%= description %>` for user-provided descriptions. Never leave generic placeholder text like "Short summary of your web part" or "Add your description here".

Note the distinction:
- **`description`** — user-provided component description (from CLI prompt)
- **`propertyPaneDescription`** — specific UI text for the property pane header

In templates:

```markdown
# <%= componentName %>

## Summary

<%= description %>
```

In localization files:

```javascript
// Correct
PropertyPaneDescription: '<%= description %>',

// Wrong — generic text
PropertyPaneDescription: 'Description for property pane',
```

## Version Management

Always use the `spfxVersion` variable — never hardcode version numbers. For shields.io badge
URLs, use `spfxVersionForBadgeUrl` instead, which escapes hyphens so the badge renders correctly
for prerelease versions like `1.23.0-beta.0`.

```json
"@microsoft/sp-core-library": "~<%= spfxVersion %>"
```

In README badges (use `spfxVersionForBadgeUrl` to escape hyphens for shields.io):

```markdown
![version](https://img.shields.io/badge/version-<%= spfxVersionForBadgeUrl %>-blue)
```

In `package-solution.json`:

```json
"version": "<%= spfxVersion %>.0"
```

In rendered examples, all SPFx dependencies within a `package.json` must use the same version — no mixed versions.

## Code Quality

- 2-space indentation (matches SPFx generator defaults)
- No extra blank lines between imports and class declarations
- Remove trailing whitespace
- Files end with a single newline

## Rendered Examples

After a template is scaffolded, the generated example must not contain:

- Raw EJS template syntax (`<%= %>`)
- Placeholder text like "Short summary of your web part" or "Description goes here"
- `undefined` in version strings or other fields
- Mixed SPFx dependency versions

Example READMEs should have real content: a component name header, an actual summary, and a correct version badge.

## Pre-Submit Checklist

- [ ] String literal IDs use ALL_CAPS
- [ ] Bundle IDs use `.hyphen`, localization modules use `.pascal`
- [ ] README uses `<%= description %>` placeholder
- [ ] Localization files use description placeholders
- [ ] All version references use `<%= spfxVersion %>`
- [ ] No "undefined" strings in generated output
- [ ] No template syntax (`<%= %>`) remains in rendered examples
- [ ] SPFx solution examples include `_phase:build`, `_phase:test`, and `_phase:package-solution` scripts
- [ ] No extra blank lines
- [ ] Generated example matches template output exactly

## Troubleshooting

- **Which variable to use?** Check template.json `contextSchema`
- **How to format a specific identifier?** Look at existing working templates
- **Incorrect casing in example IDs?** Fix the template, not the example
- **Template syntax in rendered example?** Regenerate from the template
- **Version mismatches?** Check template.json `spfxVersion` variable

When in doubt, consult the `webpart-minimal` template as the reference implementation.
