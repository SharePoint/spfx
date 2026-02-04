# PR Review Ready

**Skill Name:** pr-review-ready
**Description:** Automates the process of getting a pull request ready for human review by addressing comments, fixing issues, and ensuring CI passes.

## Overview

This skill automates the tedious process of preparing a PR for final human review by:
1. Reading all review comments (Copilot, human reviewers, etc.)
2. Analyzing each comment to decide whether to fix, ignore, or ask for clarification
3. Making necessary code changes
4. Replying to each comment with explanation of changes or reasoning
5. Resolving review threads
6. Verifying CI passes
7. Looping until all issues are resolved and CI is green

## Usage

```bash
# Basic usage - uses current branch's PR
/pr-review-ready

# Specify a PR number
/pr-review-ready 26

# Specify repository and PR
/pr-review-ready --repo SharePoint/spfx --pr 26
```

## What This Skill Does

### 1. Fetch PR Information
- Retrieves PR number from current branch or from arguments
- Gets PR metadata (title, description, base branch)
- Identifies review comments and threads

### 2. Analyze Comments
For each comment, the skill will:
- Read the comment content and context
- Determine if it's from Copilot, a human reviewer, or bot
- Check for explicit user instructions (e.g., "Fix this", "Ignore this")
- Analyze the code suggestion or concern raised

### 3. Decision Making
The skill decides to:
- **Fix**: If the comment points out a valid issue (bugs, security, best practices)
- **Ignore**: If explicitly instructed, or if the suggestion doesn't apply
- **Ask**: If the comment is ambiguous and needs clarification

### 4. Make Changes
- Reads relevant files
- Makes necessary code changes
- Runs local builds/tests if needed
- Commits changes with descriptive messages

### 5. Reply and Resolve
- Posts a reply to each comment explaining the action taken
- Resolves threads that have been addressed
- Leaves threads open if asking for clarification

### 6. CI Loop
- Checks CI status after all changes
- If CI fails, analyzes failure logs
- Makes fixes and repeats until CI passes

## Comment Analysis Rules

### Auto-Fix Scenarios
The skill will automatically fix these without asking:
- ESLint/type errors
- Security vulnerabilities
- Missing error handling
- Obvious bugs or typos
- Inconsistent formatting
- Missing documentation for public APIs

### Auto-Ignore Scenarios
The skill will ignore these comments:
- Breaking change concerns (marked as "doesn't matter")
- Stylistic preferences without clear rationale
- Comments explicitly marked "ignore"

### Ask for Clarification
The skill will ask the user when:
- Comment suggests multiple valid approaches
- Architectural decision required
- Unclear requirements
- Trade-offs between different solutions

## Parameters

- `--pr <number>`: PR number to process (default: infer from current branch)
- `--repo <owner/name>`: Repository (default: origin remote)
- `--max-iterations <number>`: Maximum CI fix attempts (default: 5)
- `--auto-commit`: Automatically commit and push changes (default: true)
- `--dry-run`: Show what would be done without making changes

## Example Workflow

```
User: /pr-review-ready

1. [Analyzing PR #26]
   - Found 7 unresolved Copilot comments
   - Found 0 human reviewer comments

2. [Processing Comments]
   ✓ Comment 1: "Fix validation" → Making fix
   ✓ Comment 2: "Use lodash" → Making fix
   ✓ Comment 3: "Handle edge case" → Making fix
   ○ Comment 4: "Ignore this" → Skipping
   ...

3. [Committing Changes]
   ✓ Committed: "Address review comments: add validation, use lodash, handle edge cases"

4. [Replying to Comments]
   ✓ Replied to 7 comments
   ✓ Resolved 7 threads

5. [Checking CI]
   ⟳ CI running...
   ✓ All checks passed!

6. [Summary]
   PR #26 is ready for human review:
   - 3 issues fixed
   - 4 comments addressed
   - 7 threads resolved
   - CI passing ✓
```

## Integration with Existing Tools

This skill uses:
- `gh` CLI for GitHub API operations
- `git` for branch and commit operations
- `Bash` for running builds and tests
- `Read/Edit/Write` tools for code modifications
- `Grep/Glob` for code search and discovery

## Error Handling

If the skill encounters issues:
- **CI fails after max iterations**: Reports failure details and stops
- **Conflicting comments**: Asks user for guidance
- **API rate limits**: Waits and retries
- **Build failures**: Analyzes logs and attempts fixes

## Best Practices

1. **Review before merging**: This skill prepares PRs but doesn't merge them
2. **Human oversight**: Always review the changes made by the skill
3. **Explicit instructions**: For ambiguous comments, provide clear "fix" or "ignore" guidance
4. **Iterative refinement**: The skill may need multiple runs for complex PRs

## Configuration

Create `.claude/pr-review-ready.json` to customize:

```json
{
  "autoCommit": true,
  "maxIterations": 5,
  "requireCIPass": true,
  "resolveThreadsAutomatically": true,
  "commentReplyTemplate": "Addressed in commit {commit}"
}
```

## Future Enhancements

- Support for multiple PRs in batch
- Integration with JIRA/Linear for ticket updates
- Automated changelog generation
- Performance regression detection
- Security vulnerability scanning
