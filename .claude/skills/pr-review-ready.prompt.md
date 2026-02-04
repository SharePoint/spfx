# PR Review Ready Skill

You are helping prepare a pull request for human review. Your goal is to address all review comments, fix issues, and ensure CI passes before the PR is ready for final approval.

## Input Parameters

- **pr_number**: The pull request number (required, or infer from current branch)
- **repo**: Repository in format "owner/name" (default: infer from git remote)
- **max_ci_iterations**: Maximum number of CI fix attempts (default: 5)

## Workflow

### Step 1: Fetch PR Information

```bash
# Get PR number from current branch if not provided
gh pr status --json number,headRefName -q '.currentBranch.number'

# Parse repo into owner and name
REPO="{repo}"
OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

# Get PR details
gh pr view {pr_number} --repo {repo} --json title,body,number,headRefName,baseRefName,state
```

### Step 2: Fetch All Review Comments

Use GitHub API to fetch:
1. Review comments (code comments)
2. Issue comments (general PR comments)
3. Review threads and their resolution status

```bash
# Parse repo into owner and name
REPO="{repo}"
OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

# Get review comments
gh api "repos/$OWNER/$REPO_NAME/pulls/{pr_number}/comments"

# Get review threads (for resolution tracking)
gh api graphql -f query="
  query {
    repository(owner: \"$OWNER\", name: \"$REPO_NAME\") {
      pullRequest(number: {pr_number}) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            isOutdated
            comments(first: 50) {
              nodes {
                id
                author { login }
                body
                path
                line
                createdAt
              }
            }
          }
        }
      }
    }
  }
"
```

### Step 3: Analyze Each Comment

For each unresolved comment:

1. **Read the comment content**
   - Extract the comment text
   - Identify the file and line number
   - Note the author (Copilot, human, bot)

2. **Check for explicit user instructions**
   - Look for user replies like "Fix this", "Ignore this", "doesn't matter"
   - If found, follow the instruction explicitly

3. **Analyze the suggestion**
   - Is it a bug fix? → Fix it
   - Is it a security issue? → Fix it immediately
   - Is it about code quality/best practices? → Fix it
   - Is it a style preference? → Check if there's a style guide
   - Is it about documentation? → Add/update docs
   - Is it about tests? → Add/update tests

4. **Decision matrix**:
   ```
   IF user said "fix" → FIX
   ELSE IF user said "ignore" → SKIP
   ELSE IF security/bug → FIX
   ELSE IF eslint/type error → FIX
   ELSE IF architectural change → ASK USER
   ELSE IF unclear → ASK USER
   ELSE → FIX (default to addressing feedback)
   ```

### Step 4: Make Fixes

For each comment that needs fixing:

1. **Read the file** (if code comment)
   ```bash
   # Use Read tool with file path from comment
   ```

2. **Make the change**
   - Use Edit tool for existing files
   - Use Write tool for new files
   - Follow the suggestion in the comment
   - Preserve existing code style and formatting

3. **Verify the change**
   - Run local build if applicable
   - Check for related files that might need updates

### Step 5: Commit Changes

After making all fixes:

```bash
git add .
git commit -m "$(cat <<'EOF'
Address review comments

- Fix: [description of fix 1]
- Fix: [description of fix 2]
- Add: [description of addition]
- Update: [description of update]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
git push
```

### Step 6: Reply to Comments

For each comment processed:

1. **Determine reply message**:
   - If fixed: "Fixed in commit {commit_sha}. [Brief description of what was changed]"
   - If ignored (user instructed): "Skipping as instructed."
   - If ignored (not applicable): "This doesn't apply because [reason]."
   - If needs clarification: "Could you clarify [specific question]?"

2. **Post inline reply to the review comment**:
   ```bash
   # Parse repo into owner and name
   REPO="{repo}"
   OWNER="${REPO%%/*}"
   REPO_NAME="${REPO##*/}"

   # Reply directly to the review comment thread
   gh api \
     --method POST \
     "repos/$OWNER/$REPO_NAME/pulls/comments/{comment_id}/replies" \
     -f body="{reply_message}"
   ```

### Step 7: Resolve Threads

For each thread that was addressed:

```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "{thread_id}"}) {
      thread {
        id
        isResolved
      }
    }
  }
'
```

### Step 8: Check CI Status

```bash
# Check CI status
gh pr checks {pr_number} --repo {repo}
```

### Step 9: CI Fix Loop

If CI fails and iterations < max_ci_iterations:

1. **Analyze failure**:
   - Read CI logs
   - Identify failure cause (lint, tests, build, etc.)

2. **Make fix**:
   - Address the specific failure
   - Commit with message: "Fix CI: [description]"
   - Push changes

3. **Wait for CI** and repeat until:
   - CI passes → DONE
   - Max iterations reached → REPORT FAILURE

### Step 10: Summary Report

Report to user:
```
✓ PR #{pr_number} is ready for human review

Changes Made:
- {count} issues fixed
- {count} comments addressed
- {count} threads resolved
- {count} commits pushed

CI Status: ✓ PASSING

Next Steps:
- Review the changes at {pr_url}
- Merge when ready
```

## Important Rules

1. **NEVER merge PRs** - only humans should merge
2. **NEVER force push** - preserve commit history
3. **Always commit changes** - don't leave uncommitted work
4. **Always reply to comments** - communication is key
5. **Resolve threads only after addressing** - don't resolve prematurely
6. **Stop after max iterations** - don't loop forever on CI failures
7. **Ask when unsure** - use AskUserQuestion for ambiguous situations
8. **Follow user instructions** - explicit user guidance overrides everything

## Error Handling

- **GitHub API rate limit**: Wait and retry
- **Git conflicts**: Report to user, don't auto-resolve
- **Build failures**: Try to fix, but stop after max iterations
- **Ambiguous comments**: Ask user for clarification
- **Missing permissions**: Report error and stop

## Examples

### Example 1: Simple Copilot Comments

```
Input: /pr-review-ready 26

Process:
1. Fetch PR #26
2. Find 3 Copilot comments:
   - "Add validation" → Fix
   - "Use lodash" → Fix
   - "Typo: 'teh' should be 'the'" → Fix
3. Make all fixes
4. Commit: "Address review comments: add validation, use lodash, fix typo"
5. Reply to each comment
6. Resolve 3 threads
7. Check CI → PASS
8. Report: "PR #26 ready ✓"
```

### Example 2: Mixed Comments with User Instructions

```
Input: /pr-review-ready 26

Process:
1. Fetch PR #26
2. Find 5 comments:
   - Copilot: "Add error handling" + User reply: "Fix this" → Fix
   - Copilot: "Consider async/await" + User reply: "Ignore" → Skip
   - Copilot: "Extract to function" (no user reply) → Fix (good practice)
   - Human: "Should this be public API?" → Ask user
   - Bot: "Outdated" → Skip
3. Make 2 fixes (error handling, extract function)
4. Ask user about public API question
5. Commit fixes
6. Reply to all comments
7. Resolve 2 threads (fixed), leave 1 open (question)
8. Check CI → FAIL (eslint)
9. Fix eslint issue
10. Commit: "Fix CI: resolve eslint warnings"
11. Check CI → PASS
12. Report: "PR #26 ready ✓ (1 question pending)"
```

### Example 3: CI Fails Repeatedly

```
Input: /pr-review-ready 26

Process:
1. Address all comments (3 fixed)
2. Check CI → FAIL (tests)
3. Fix failing tests
4. Check CI → FAIL (build error)
5. Fix build error
6. Check CI → FAIL (type error)
7. Fix type error
8. Check CI → PASS
9. Report: "PR #26 ready ✓ (4 CI fix iterations)"
```

## Configuration

Default settings:
- max_ci_iterations: 5
- auto_resolve_threads: true
- require_ci_pass: true
- auto_commit: true

Override with flags:
```bash
/pr-review-ready 26 --max-ci-iterations 10 --no-auto-commit
```
