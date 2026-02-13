# PR Review Loop

Automates the complete pull request review cycle from comment review to CI validation.

## What This Skill Does

This skill handles the entire PR review workflow:
1. Checks out the correct branch for a given PR number
2. Fetches and analyzes all unresolved review comments (both Copilot and human)
3. Determines which comments need code changes vs just responses
4. Makes necessary code changes following repository patterns
5. Builds locally and fixes any build issues
6. Commits changes with proper attribution
7. Responds to each comment explaining the fix
8. Resolves conversations that have been addressed
9. Pushes changes to the remote branch
10. Waits for CI to complete and fixes any CI failures
11. Reports final status

## Usage

```bash
/pr-review-loop <pr-number>
```

Example:
```bash
/pr-review-loop 19
```

## Instructions

You are now in PR Review Loop mode. Follow these steps systematically:

### Step 1: Checkout PR Branch

1. Get the PR details using `gh pr view {pr_number} --repo SharePoint/spfx --json headRefName,state`
2. Verify the PR is open
3. Checkout the branch: `git checkout {headRefName}`
4. Pull latest changes: `git pull`

### Step 2: Fetch All Review Comments

1. Fetch all PR comments: `gh api repos/SharePoint/spfx/pulls/{pr_number}/comments`
2. Fetch the PR reviews: `gh api repos/SharePoint/spfx/pulls/{pr_number}/reviews`
3. Filter for comments that don't already have resolution replies (look for "✅" markers in replies)
4. Categorize comments by type:
   - **Code fixes needed**: Comments pointing to specific issues in code
   - **Clarifications needed**: Questions or requests for explanation
   - **Already addressed**: Comments with checkmark responses

### Step 3: Analyze and Plan Fixes

For each comment needing a code fix:
1. Read the file mentioned in the comment
2. Understand what needs to be changed
3. Check if this change conflicts with any other comments
4. Note any dependencies (e.g., template changes require example regeneration)

Create a mental plan of all fixes to apply.

### Step 4: Apply Code Changes

For each code fix:
1. Make the necessary edit using the Edit tool
2. If changing a template file, regenerate the corresponding example
3. Verify the change matches the reviewer's request
4. Keep track of which comments each change addresses

**Important patterns for this repo:**
- Template files use EJS variables like `<%= componentName %>`
- Examples must match template output exactly
- Always use `componentDescription` not `componentNameUnescaped` for descriptions
- Bundle names should use `componentNameHyphenCase`
- Follow existing naming conventions strictly
- No extra blank lines between code blocks

### Step 5: Build and Fix Issues

1. Run `export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"` (required for this repo)
2. Run `rush update` if dependencies changed
3. Build the affected project: `cd {project_dir} && rushx build`
4. If build fails:
   - Read the error message carefully
   - Fix the issue
   - Rebuild until successful
5. Repeat for all affected projects

### Step 6: Commit Changes

1. Stage all changes: `git add -A`
2. Create a descriptive commit message:
   ```bash
   git commit -m "$(cat <<'EOF'
   Address review comments from {reviewer_name}

   - {Summary of fix 1}
   - {Summary of fix 2}
   - {Summary of fix 3}

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```
3. Push to remote: `git push`

### Step 7: Respond to Comments

For each comment you addressed:
1. Post a reply: `gh api repos/SharePoint/spfx/pulls/{pr_number}/comments/{comment_id}/replies -X POST -f body="✅ Fixed in commit {commit_sha}. {Brief explanation of what was done}"`
2. Use a checkmark (✅) prefix to mark as resolved
3. Be concise but clear about what changed

For clarification comments:
1. Post a thorough explanation
2. Reference specific code or patterns if needed

### Step 8: Resolve Conversations

**CRITICAL**: After responding to comments, resolve the conversations:

For each comment thread you fully addressed:
1. Get the conversation ID from the comment
2. Mark it as resolved using the GitHub API:
   ```bash
   gh api graphql -f query='
   mutation {
     resolveReviewThread(input: {threadId: "{thread_node_id}"}) {
       thread {
         id
         isResolved
       }
     }
   }'
   ```

To get thread IDs:
```bash
gh api graphql -f query='
query {
  repository(owner: "SharePoint", name: "spfx") {
    pullRequest(number: {pr_number}) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              databaseId
              body
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {threadId: .id, commentId: .comments.nodes[0].databaseId, body: .comments.nodes[0].body}'
```

### Step 9: Wait for CI and Handle Failures

1. Check CI status: `gh pr checks {pr_number} --repo SharePoint/spfx`
2. If CI is running, wait: `gh run watch {run_id} --repo SharePoint/spfx`
3. If CI fails:
   - Get the failure logs: `gh run view {run_id} --repo SharePoint/spfx --log-failed`
   - Analyze the error
   - Determine if it's caused by your changes
   - If yes, fix the issue and repeat from Step 4
   - If no, report the issue to the user
4. If CI passes, report success

### Step 10: Final Report

Provide a summary:
```
✅ PR Review Loop Complete for PR #{pr_number}

Addressed Comments: {count}
- {comment 1 summary}
- {comment 2 summary}
- {comment 3 summary}

Commits Made: {count}
- {commit_sha}: {commit_message}

Conversations Resolved: {count}

CI Status: ✅ Passing

The PR is ready for re-review.
```

## Error Handling

If you encounter an error at any step:
1. Report the error clearly to the user
2. Explain what you were trying to do
3. Suggest how to proceed (manual intervention vs retry)
4. Don't leave the PR in a broken state

## Special Cases

### Template Changes
- Always regenerate examples after template changes
- Use the CLI: `node "/workspaces/spfx/apps/spfx-cli/bin/spfx" create ...`
- Match the test configuration parameters

### Unrelated CI Failures
- If CI fails on something unrelated to your PR, report it
- Don't attempt to fix issues outside the scope of this PR
- Ask the user how to proceed

### Conflicting Comments
- If two comments conflict, ask the user for clarification
- Don't proceed until resolved

### Already-Resolved Comments
- Skip comments that have checkmark responses
- Don't re-respond to resolved threads

## Notes

- This skill requires the `gh` CLI to be authenticated
- Node.js path must be set for Rush commands
- The skill will automatically handle multiple rounds of fixes if CI fails
- All commits include Claude co-authorship attribution
