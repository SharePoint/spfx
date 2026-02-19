# PR Review Loop

Automates the complete pull request review cycle from comment review to CI validation.

## What This Skill Does

This skill handles the entire PR review workflow:
1. Checks out the correct branch for a given PR number
2. Merges from main and resolves any merge conflicts
3. Fetches and analyzes all unresolved review threads (both Copilot and human)
4. Determines which comments need code changes vs just responses
5. Makes necessary code changes following repository patterns
6. Builds locally and fixes any build issues
7. Commits changes with proper attribution
8. Responds to each comment explaining the fix
9. Resolves conversations that have been addressed
10. Pushes changes to the remote branch
11. Waits for CI to complete and fixes any CI failures
12. Reports final status

## Usage

```bash
/pr-review-loop <pr-number>
```

Example:
```bash
/pr-review-loop 19
```

## Parameters

| Parameter  | Type   | Required | Description                     |
|------------|--------|----------|---------------------------------|
| pr_number  | number | yes      | Pull request number to review   |

## What It Checks

- **Review threads**: Inline code comments from Copilot and human reviewers (via GraphQL `reviewThreads`)
- **Discussion comments**: General PR discussion comments (via Issues API)
- **CI status**: All required checks must pass before reporting complete

## Notes

- Requires `gh` CLI to be authenticated
- Node.js path is automatically configured for Rush commands
- Will automatically loop to fix CI failures
- All commits include Claude co-authorship attribution
- Never merges the PR — only humans should merge
