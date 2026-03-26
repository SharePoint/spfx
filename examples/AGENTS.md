# SPFx Examples

Follow the style guide at [common/docs/template-style-guide.md](../common/docs/template-style-guide.md).

Key rules for AI agents working on examples:

- Examples are generated output of templates — never hand-edit them directly
- If you find an issue in an example, fix the template and regenerate
- Registry IDs must use `.allCaps`, bundle keys must use `.hyphen`, localization modules must use `.pascal`
- No template syntax (`<%= %>`) should remain in example files
- All SPFx dependency versions must be consistent across examples
- No placeholder text in READMEs or localization files
- Reference implementation: `webpart-minimal`
