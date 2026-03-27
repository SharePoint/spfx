You are now in PR Review Loop mode. Follow these steps systematically:

### Step 1: Checkout PR Branch and Merge Main

1. Get the PR details using `gh pr view {pr_number} --repo SharePoint/spfx --json headRefName,state`
2. Verify the PR is open
3. Checkout the branch: `git checkout {headRefName}`
4. Pull latest changes: `git pull`
5. **Merge from main to resolve conflicts:**
   - Fetch main: `git fetch origin main`
   - Merge main: `git merge origin/main`
   - If there are merge conflicts:
     - List conflicted files: `git status`
     - Read each conflicted file
     - Resolve conflicts by choosing the appropriate changes
     - Stage resolved files: `git add {file}`
     - Complete the merge: `git commit -m "Merge main into {branch_name}"`
   - If merge is clean, no additional action needed

### Step 2: Fetch All Review Comments

Use GraphQL `reviewThreads` as the primary source of truth for thread state — it directly exposes `isResolved` and groups replies with their parent comment, so you don't need to infer state from reply content.

1. Fetch all unresolved review threads via GraphQL:
   ```bash
   gh api graphql -f query='
   query {
     repository(owner: "SharePoint", name: "spfx") {
       pullRequest(number: {pr_number}) {
         reviewThreads(first: 100) {
           nodes {
             id
             isResolved
             comments(first: 10) {
               nodes {
                 databaseId
                 body
                 author { login }
                 path
                 createdAt
               }
             }
           }
         }
       }
     }
   }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {threadId: .id, commentId: .comments.nodes[0].databaseId, author: .comments.nodes[0].author.login, body: .comments.nodes[0].body, path: .comments.nodes[0].path}'
   ```
2. Also fetch general PR discussion (issue) comments, which are not captured by review threads:
   ```bash
   gh api repos/SharePoint/spfx/issues/{pr_number}/comments
   ```
3. Categorize comments by type:
   - **Code fixes needed**: Comments pointing to specific issues in code
   - **Clarifications needed**: Questions or requests for explanation
   - **Already addressed**: Threads where `isResolved == true` (skip these)

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
2. If the changed file lives under `/templates/`, regenerate the corresponding example — even files without EJS variables are part of the template and their example counterpart must stay in sync
3. Verify the change matches the reviewer's request
4. Keep track of which comments each change addresses

**Important patterns for this repo:**
Read `templates/AGENTS.md` and `examples/AGENTS.md` for the complete style guide and common mistakes to avoid.

### Step 5: Build and Fix Issues

1. Run `export PATH="$HOME/AppData/Local/nvs/node/22.21.1/x64:$PATH"` (required for this repo)
2. Run `rush update` if dependencies changed
3. Build the affected project: `cd {project_dir} && rushx build`
4. If build fails:
   - Read the error message carefully
   - Fix the issue
   - Rebuild until successful
5. If templates were modified, run the template tests: `cd tests/spfx-template-test && rushx test -- -t {template-name}`
6. If tests fail:
   - The test generates the template and compares output against the example — ensure template and example are in sync
   - Fix the mismatch and rerun tests until they pass
7. Repeat for all affected projects

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
1. Post a reply: `gh api -X POST repos/SharePoint/spfx/pulls/{pr_number}/comments/{comment_id}/replies -f body="✅ Fixed in commit {commit_sha}. {Brief explanation of what was done}"`
2. Use a checkmark (✅) prefix to mark as resolved
3. Be concise but clear about what changed

For clarification comments:
1. Post a thorough explanation
2. Reference specific code or patterns if needed

### Step 8: Resolve Conversations

**CRITICAL**: After responding to comments, resolve the conversations:

For each comment thread you fully addressed:
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
- Any file under `/templates/` is part of the template, even if it has no EJS variables
- Always regenerate the corresponding example after any template file change
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
- Skip threads where `isResolved == true` from the GraphQL query
- Don't re-respond to resolved threads

## Notes

- This skill requires the `gh` CLI to be authenticated
- Node.js path must be set for Rush commands
- The skill will automatically handle multiple rounds of fixes if CI fails
- All commits include Claude co-authorship attribution
