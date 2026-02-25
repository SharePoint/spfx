# Claude Code Skills for SPFx Repository

This directory contains custom Claude Code skills for automating common development workflows in the SPFx repository.

## Available Skills

### pr-review-ready

**Purpose**: Automate the process of preparing a pull request for human review.

**Usage**:
```bash
/pr-review-ready              # Process current branch's PR
/pr-review-ready 26           # Process specific PR number
/pr-review-ready --dry-run    # Preview without making changes
```

**What it does**:
1. Fetches all review comments (Copilot, human reviewers)
2. Analyzes each comment and decides whether to fix, ignore, or ask
3. Makes necessary code changes
4. Commits changes with descriptive messages
5. Replies to each comment explaining the action taken
6. Resolves addressed review threads
7. Checks CI status
8. Loops to fix CI failures until all checks pass
9. Reports final status

**Files**:
- `pr-review-ready.json` - Skill configuration and metadata
- `pr-review-ready.prompt.md` - Detailed instructions for Claude
- `pr-review-ready.md` - User documentation

## Creating New Skills

To create a new skill:

1. **Create skill files**:
   ```bash
   .claude/skills/
   ├── my-skill.json           # Configuration
   ├── my-skill.prompt.md      # Claude instructions
   └── my-skill.md             # Documentation
   ```

2. **Define configuration** (`my-skill.json`):
   ```json
   {
     "name": "my-skill",
     "version": "1.0.0",
     "description": "Brief description",
     "type": "prompt",
     "promptFile": "my-skill.prompt.md",
     "parameters": {
       "param1": {
         "type": "string",
         "description": "Parameter description",
         "required": false,
         "default": "default-value"
       }
     }
   }
   ```

3. **Write instructions** (`my-skill.prompt.md`):
   - Clear step-by-step workflow
   - Command examples
   - Error handling guidance
   - Decision logic

4. **Document usage** (`my-skill.md`):
   - Overview and purpose
   - Usage examples
   - Parameters and options
   - Common scenarios

## Skill Development Best Practices

1. **Be specific**: Provide clear, unambiguous instructions
2. **Handle errors**: Include error handling for common failures
3. **Provide examples**: Show concrete examples of the skill in action
4. **Set boundaries**: Define what the skill should NOT do
5. **Test thoroughly**: Test the skill on various scenarios
6. **Document well**: Make it easy for others to understand and use

## Skill Structure

### Configuration File (`.json`)

Defines metadata and parameters:
- `name`: Skill identifier (used in `/skill-name`)
- `version`: Semantic version
- `description`: Brief one-liner
- `type`: `"prompt"`, `"script"`, or `"agent"`
- `parameters`: Input parameters with types and defaults

### Prompt File (`.prompt.md`)

Instructions for Claude:
- **Workflow**: Step-by-step process
- **Decision logic**: How to handle different scenarios
- **Commands**: Exact commands to run
- **Error handling**: What to do when things go wrong
- **Examples**: Concrete examples of execution

### Documentation File (`.md`)

User-facing documentation:
- **Overview**: What the skill does
- **Usage**: How to invoke it
- **Parameters**: Input options
- **Examples**: Common use cases
- **Configuration**: Customization options

## Testing Skills

To test a skill:

1. **Dry run**: Use `--dry-run` flag to preview
2. **Small scope**: Test on simple PRs first
3. **Review output**: Check commits and comments made
4. **Iterate**: Refine based on results

## Contributing Skills

When adding new skills:

1. Create a feature branch
2. Add skill files to `.claude/skills/`
3. Update this README
4. Test the skill thoroughly
5. Create a PR with examples

### fix-issue

**Purpose**: Fix a GitHub issue end-to-end, from investigation to a CI-passing PR.

**Usage**:
```bash
/fix-issue 43
```

**What it does**:
1. Checks out latest `main` and creates `fix/issue-{number}` branch
2. Launches parallel subagents to investigate the issue and codebase
3. Enters plan mode for user approval before making any changes
4. Implements the fix following repository patterns
5. Builds and tests locally, looping until passing
6. Opens a PR that closes the issue
7. Watches CI and auto-fixes any failures until all checks pass

**Files**:
- `fix-issue/skill.json` - Skill configuration
- `fix-issue/prompt.md` - Detailed instructions for Claude
- `fix-issue/SKILL.md` - User documentation

## Skill Ideas

Potential skills for future development:

- `rush-build-check` - Validate Rush build before committing
- `template-sync` - Keep templates and examples in sync
- `dependency-update` - Update dependencies across workspace
- `pr-batch-merge` - Merge multiple PRs in sequence
- `changelog-generate` - Generate changelog from commits
- `api-review` - Check for API breaking changes
