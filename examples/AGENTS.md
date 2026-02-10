# SPFx Examples Development Style Guide

This guide contains critical guidelines for maintaining SPFx examples. Examples are the rendered output of templates and must stay synchronized with their template definitions.

## Purpose of Examples

Examples serve as:
1. **Reference implementations** - Show what the template generates
2. **Test fixtures** - Used in automated tests to verify template output
3. **Documentation** - Demonstrate how components should be structured

**Golden Rule**: Examples must be generated from templates, never hand-edited directly. Any changes should be made to the template first, then regenerated.

## Naming Conventions in Examples

### String Literal IDs Must Be ALL_CAPS

TypeScript constant IDs should use all uppercase:

```typescript
// ✅ CORRECT
public static readonly GENERICCARD_CARD_VIEW = 'GENERICCARD_CARD_VIEW';
public static readonly SEARCHCARD_QUICK_VIEW = 'SEARCHCARD_QUICK_VIEW';

// ❌ WRONG - Mixed case in IDs
public static readonly GenericCard_CARD_VIEW = 'GenericCard_CARD_VIEW';
public static readonly SearchCard_QUICK_VIEW = 'SearchCard_QUICK_VIEW';
```

**Common locations**:
- AdaptiveCardExtension view IDs
- FormCustomizer/FieldCustomizer component IDs
- Any `public static readonly` string constants

### Localization Keys Must Be Hyphen-Case

Localization string keys should use lowercase with hyphens:

```typescript
// ✅ CORRECT - in loc/en-us.js
PropertyPaneDescription: 'generic-card-property-pane'
SearchCardPropertyDescription: 'search-card-property-pane'

// ❌ WRONG - Capital letters or wrong separators
PropertyPaneDescription: 'GenericCard-property-pane'
PropertyPaneDescription: 'generic_card_property_pane'
```

## Version and Configuration

### package.json Version Consistency

All SPFx dependency versions must match across examples:

```json
// ✅ CORRECT - Consistent version
{
  "@microsoft/sp-core-library": "~1.22.1",
  "@microsoft/sp-webpart-base": "~1.22.1",
  "@microsoft/sp-adaptive-card-extension-base": "~1.22.1"
}

// ❌ WRONG - Mixed versions
{
  "@microsoft/sp-core-library": "~1.22.1",
  "@microsoft/sp-webpart-base": "~1.22.0",  // Different!
}
```

### package-solution.json

Version must be properly formatted:

```json
// ✅ CORRECT
{
  "solution": {
    "version": "1.22.1.0"
  }
}

// ❌ WRONG - Malformed version string
{
  "solution": {
    "version": "undefined-1.22.1"
  }
}
```

### README.md Version Badges

Version badges should match package.json SPFx version:

```markdown
✅ CORRECT
![version](https://img.shields.io/badge/version-1.22.1-blue)

❌ WRONG
![version](https://img.shields.io/badge/version-1.22.0-blue)
```

## Documentation Requirements

### README.md Structure

Every example README should include:

1. **Component Name Header**
2. **Summary section** with actual description (not placeholder text)
3. **Used SharePoint Framework Version** badge
4. **Prerequisites**, **Version history**, etc.

```markdown
# Generic Card

## Summary

This sample shows how to build an Adaptive Card Extension using the generic card template.

## Used SharePoint Framework Version

![version](https://img.shields.io/badge/version-1.22.1-blue)
```

❌ **NEVER** leave placeholder text like:
- "Short summary of your web part"
- "Description goes here"
- "<%= description %>"

### Localization Files (loc/*.js)

Property pane descriptions should be meaningful, not template syntax:

```javascript
// ✅ CORRECT
define([], function() {
  return {
    PropertyPaneDescription: 'Configuration options for Generic Card'
  }
});

// ❌ WRONG - Template syntax left in example
PropertyPaneDescription: '<%= description %>'
```

## Code Quality Standards

### No Extra Blank Lines

Remove unnecessary blank lines:

```typescript
// ✅ CORRECT
import * as React from 'react';
import * as strings from 'MyStrings';

export default class MyComponent extends React.Component {
```

```typescript
// ❌ WRONG - Extra blank lines
import * as React from 'react';
import * as strings from 'MyStrings';


export default class MyComponent extends React.Component {
```

### Consistent Formatting

- Use 2-space indentation
- Remove trailing whitespace
- Files end with single newline
- Follow TypeScript/React best practices

## Regenerating Examples

When a template changes, regenerate the corresponding example:

```bash
# Ensure correct Node version
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"

# Navigate to example directory
cd examples/ace-generic-card

# Clean and regenerate (using CLI with --local-template flag)
# Details depend on your specific regeneration workflow

# Verify it builds
rushx build
```

**Important**: After regeneration, review the diff to ensure:
- Only intended changes from template modifications
- No accidental hand-edits or formatting changes
- All naming conventions are correct
- No template syntax (<%=, %>) remains

## Common Issues Checklist

Before committing an example, verify:

- [ ] All TypeScript string literal IDs are ALL_CAPS
- [ ] All localization keys are hyphen-case (lowercase with hyphens)
- [ ] README.md has actual content, not placeholder text or template syntax
- [ ] package.json versions are consistent (all dependencies use same SPFx version)
- [ ] package-solution.json version is properly formatted (no "undefined")
- [ ] Version badge in README matches package.json SPFx version
- [ ] No extra blank lines in source files
- [ ] No template syntax (<%= %>) remains in any file
- [ ] Component builds successfully with `rushx build`
- [ ] Component passes `rushx package-solution`

## Template vs Example Synchronization

Examples must match template output exactly. If you find issues in an example:

1. **Don't fix the example directly** - Fix the template instead
2. **Update the template** to generate correct output
3. **Regenerate the example** from the corrected template
4. **Submit both changes** in the same PR

This ensures templates remain the source of truth and prevents drift.

## Testing Your Example

Before submitting a PR:

```bash
# Build the example
export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"
cd examples/your-example-name
rushx build

# Run template comparison tests
cd ../../tests/templates-test
rushx test -- -t your-template-name
```

Tests will fail if:
- Example doesn't match template output
- Naming conventions are violated
- Template syntax remains in files

## Questions?

If you notice:
- **Incorrect casing in IDs** → This is a template issue, fix the template
- **Template syntax in example** → Regenerate from template
- **Version mismatches** → Check template.json spfxVersion variable
- **Build failures** → Verify Node version and rush update

When in doubt, compare with the webpart-minimal example as the reference implementation.

## Rush Configuration

Examples are registered in `/workspaces/spfx/rush.json` and must:
- Use consistent version policy
- Follow naming convention: `examples-<template-name>`
- Have correct project folder path
- Be included in template tests

See rush.json projects array for proper configuration format.
