# Template Style Guide

This guide covers naming conventions, variable usage, and code quality standards for SPFx templates. These rules prevent common mistakes identified in code reviews.

## Template Variable Reference

| Variable | Case | Use for | Example |
|----------|------|---------|---------|
| `componentName` | original | Display name | "Generic Card" |
| `componentNameCamelCase` | camelCase | File/folder names | "genericCard" |
| `componentNameCapitalCase` | PascalCase | Class names | "GenericCard" |
| `componentNameHyphenCase` | kebab-case | CSS classes, IDs, localization keys | "generic-card" |
| `componentNameAllCaps` | UPPER_CASE | String literal IDs | "GENERICCARD" |
| `libraryName` | scoped | Package name | "@spfx-template/generic-card" |
| `description` | — | User-provided description | User's text |
| `spfxVersion` | — | SPFx framework version | "1.22.2" |

If you need a case transformation that doesn't exist, either:
1. Add it to the template.json `contextSchema`
2. Or transform inline with EJS: `<%= componentName.toUpperCase().replace(/[^A-Z0-9]/g, '') %>`

## Naming Conventions

### String literal IDs — ALL_CAPS

```typescript
// Correct
public static readonly GENERICCARD_CARD_VIEW = 'GENERICCARD_CARD_VIEW';

// Wrong — mixed case
public static readonly GenericCard_CARD_VIEW = 'GenericCard_CARD_VIEW';
```

### Localization keys — kebab-case

```typescript
// Correct
PropertyPaneDescription: 'generic-card-property-pane'

// Wrong — capital letters
PropertyPaneDescription: 'GenericCard-property-pane'
```

### TypeScript identifiers — camelCase / PascalCase

Use `componentNameCamelCase` for instances and `componentNameCapitalCase` for class names.

## Description Placeholders

Use `<%= description %>` for user-provided descriptions. Never leave generic placeholder text.

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

Always use the `spfxVersion` variable — never hardcode version numbers.

```json
"@microsoft/sp-core-library": "~<%= spfxVersion %>"
```

In README badges:

```markdown
![version](https://img.shields.io/badge/version-<%= spfxVersion %>-blue)
```

In `package-solution.json`:

```json
"version": "<%= spfxVersion %>.0"
```

## Code Quality

- 2-space indentation (matches SPFx generator defaults)
- No extra blank lines between imports and class declarations
- Remove trailing whitespace
- Files end with a single newline

## Pre-Submit Checklist

- [ ] String literal IDs use ALL_CAPS
- [ ] Localization keys use kebab-case
- [ ] README uses `<%= description %>` placeholder
- [ ] Localization files use description placeholders
- [ ] All version references use `<%= spfxVersion %>`
- [ ] No "undefined" strings in generated output
- [ ] No extra blank lines
- [ ] Generated example matches template output exactly

When in doubt, consult the `webpart-minimal` template as the reference implementation.
