# SPFx Template Development Style Guide

This guide contains critical guidelines for creating and maintaining SPFx templates. These rules prevent common mistakes identified in code reviews.

## Template Variable Naming Conventions

### Required Variable Cases

When using component name variables in templates, ensure you use the correct case transformation:

- **ALL_CAPS for TypeScript string literal IDs**: Use `componentNameAllCaps` or manually uppercase
  ```typescript
  // ✅ CORRECT
  public static readonly GENERICCARD_CARD_VIEW = 'GENERICCARD_CARD_VIEW';

  // ❌ WRONG
  public static readonly GenericCard_CARD_VIEW = 'GenericCard_CARD_VIEW';
  ```

- **hyphen-case for localization keys**: Use `componentNameHyphenCase`
  ```typescript
  // ✅ CORRECT
  strings.PropertyPaneDescription = 'generic-card-property-pane';

  // ❌ WRONG
  strings.PropertyPaneDescription = 'GenericCard-property-pane';
  ```

- **camelCase for TypeScript identifiers**: Use `componentNameCamelCase`
  ```typescript
  // ✅ CORRECT
  export default class GenericCardAdaptiveCardExtension
  ```

### Missing Template Variables

If you need a case transformation that doesn't exist (e.g., `componentNameAllCaps`), either:
1. Add it to the template.json contextSchema
2. OR manually transform in the template using EJS: `<%= componentName.toUpperCase().replace(/[^A-Z0-9]/g, '') %>`

## Description and Documentation Placeholders

### README.md Files

Always use the `<%= description %>` placeholder for user-provided descriptions:

```markdown
# <%= componentName %>

## Summary

<%= description %>

## Used SharePoint Framework Version
```

❌ **NEVER** use generic placeholder text like:
- "Short summary of your web part"
- "This is the description"
- "Add your description here"

### Localization Files (loc/*.js)

Property pane descriptions should use placeholders:

```javascript
// ✅ CORRECT
PropertyPaneDescription: '<%= description %>',

// ❌ WRONG
PropertyPaneDescription: 'Description for property pane',
```

If you're unsure whether to use `description` vs another field, check:
- **description**: User-provided component description (from CLI prompt)
- **propertyPaneDescription**: Specific UI text for property pane header

## Version Management

### SPFx Version Consistency

1. **Centralize version numbers**: Always use the `spfxVersion` variable from template.json
   ```json
   {
     "context": {
       "spfxVersion": "1.22.1"
     }
   }
   ```

2. **In package.json dependencies**: Use `<%= spfxVersion %>`
   ```json
   "@microsoft/sp-core-library": "~<%= spfxVersion %>"
   ```

3. **In README badges**: Use `<%= spfxVersion %>`
   ```markdown
   ![version](https://img.shields.io/badge/version-<%= spfxVersion %>-blue)
   ```

4. **Never hardcode versions**: Avoids version drift and update overhead

### package-solution.json Version Format

Ensure the version string is properly formatted:

```json
// ✅ CORRECT
{
  "version": "<%= spfxVersion %>.0"
}

// ❌ WRONG - Results in "undefined-1.22.1"
{
  "version": "undefined-<%= spfxVersion %>"
}
```

## Code Quality Standards

### No Extra Blank Lines

Remove unnecessary blank lines between imports and class declarations:

```typescript
// ✅ CORRECT
import * as React from 'react';
import * as strings from 'MyStrings';

export default class MyComponent extends React.Component {
```

```typescript
// ❌ WRONG
import * as React from 'react';
import * as strings from 'MyStrings';


export default class MyComponent extends React.Component {
```

### Consistent Formatting

- Use 2-space indentation (matches SPFx generator defaults)
- Follow existing code formatting in the template
- Remove trailing whitespace
- Ensure files end with a single newline

## Template Variable Reference

Common template variables and their use cases:

| Variable | Case | Use For | Example |
|----------|------|---------|---------|
| `componentName` | original | User input | "Generic Card" |
| `componentNameCamelCase` | camelCase | File/folder names | "genericCard" |
| `componentNameCapitalCase` | PascalCase | Class names | "GenericCard" |
| `componentNameHyphenCase` | hyphen-case | CSS, IDs, keys | "generic-card" |
| `componentNameAllCaps` | UPPER_CASE | String IDs | "GENERICCARD" |
| `libraryName` | scoped | Package name | "@spfx-template/generic-card" |
| `description` | n/a | User description | User's text |
| `spfxVersion` | n/a | SPFx version | "1.22.1" |

## Testing Your Template

Before submitting a template PR:

1. **Regenerate the example** from your template:
   ```bash
   export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
   cd examples/your-template-name
   rushx build
   ```

2. **Check for common issues**:
   - Search for hardcoded component names (should use variables)
   - Search for "undefined" in generated files
   - Verify all description placeholders are used
   - Check that string IDs are ALL_CAPS
   - Check that localization keys are hyphen-case
   - Verify version badge matches spfxVersion

3. **Run template tests**:
   ```bash
   cd tests/templates-test
   rushx test -- -t your-template-name
   ```

## Common Mistakes Checklist

Before submitting a PR, verify:

- [ ] All TypeScript string literal IDs use ALL_CAPS format
- [ ] All localization property keys use hyphen-case format
- [ ] README.md uses `<%= description %>` placeholder
- [ ] Localization files use description placeholders (not generic text)
- [ ] All version references use `<%= spfxVersion %>` variable
- [ ] No "undefined" strings in package-solution.json
- [ ] No extra blank lines in code
- [ ] Version badge in README matches spfxVersion
- [ ] Template variables match their intended use case
- [ ] Generated example matches template output exactly

## Questions?

If you're unsure about:
- Which variable to use → Check template.json contextSchema
- How to format a specific identifier → Look at existing working templates
- Whether to add a new variable → Consider if it prevents hardcoding

When in doubt, consult the webpart-minimal template as the reference implementation.
