You are now in Fix Issue mode. You will fix GitHub issue #{issue_number} from start to finish. Follow every step carefully and do not skip any.

## Step 1: Set Up a Clean Branch

1. Ensure you are starting from the latest main:
   ```bash
   git checkout main
   git pull
   ```
2. Create and switch to a dedicated fix branch:
   ```bash
   git checkout -b fix/issue-{issue_number}
   ```
3. Confirm the branch was created:
   ```bash
   git branch --show-current
   ```

## Step 2: Investigate the Issue and Codebase

Use the Task tool to launch **two parallel subagents**:

**Subagent A — Issue deep-read**: Use a `general-purpose` subagent to fetch and fully understand the GitHub issue:
- `gh issue view {issue_number} --repo SharePoint/spfx --json title,body,labels,comments`
- Read every linked file path or template name mentioned in the issue
- Summarize: what is broken, which files are affected, what the expected correct state is

**Subagent B — Codebase investigation**: Use an `Explore` subagent to read all files directly relevant to the issue:
- Read the specific templates and/or config files mentioned
- Read sibling templates (same family) to understand what the correct pattern looks like
- Note the exact lines that need to change and what they should become

Wait for both subagents to complete, then synthesize their findings before proceeding.

## Step 3: Enter Plan Mode

Call the `EnterPlanMode` tool now.

In plan mode:
- Write out a precise, file-by-file plan of every change you will make
- For each change, state: the file path, the current (wrong) content, and the correct content it should become
- If any template file changes, note that you will also need to regenerate/update the corresponding example in `examples/`
- Note any build or test verification steps required
- Ask the user clarifying questions via `AskUserQuestion` if anything is ambiguous

Once your plan is written, call `ExitPlanMode` to request user approval. Do not make any file changes until the plan is approved.

## Step 4: Implement the Fix

After the plan is approved, implement every change from the plan:

1. Edit each file using the Edit tool — prefer targeted edits over full rewrites
2. If any changed file is under `templates/`, check whether the corresponding `examples/` file also needs updating to stay in sync. If so, update it too.
3. Double-check each edit against the plan to make sure nothing was missed

## Step 5: Build and Verify Locally

1. If you changed any files in a buildable project (anything with a `package.json` under `examples/`, `apps/`, or `libraries/`):
   - Navigate to that project and build it:
     ```bash
     cd {project_dir}
     rushx build
     ```
   - If the build fails, read the error output carefully, fix the issue, and rebuild. Loop until the build succeeds.

2. If you changed any template files under `templates/`, run the template tests:
   ```bash
   cd tests/spfx-template-test
   rushx _phase:test -- -t {template-name}
   ```
   - If the test fails, the scaffolded output doesn't match the example — fix the mismatch and rerun until tests pass.

3. Do not proceed until everything builds and tests locally.

## Step 6: Commit the Changes

Stage and commit the changes with a clear message:

```bash
git add {specific files changed — do not use -A blindly}
git commit -m "$(cat <<'EOF'
Fix #{issue_number}: {short description of what was fixed}

{One or two sentences explaining the root cause and what was changed.}

Closes #{issue_number}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Then push the branch:
```bash
git push -u origin fix/issue-{issue_number}
```

## Step 7: Open a Pull Request

Create a PR that references the issue:

```bash
gh pr create \
  --title "Fix #{issue_number}: {short description}" \
  --body "$(cat <<'EOF'
## Summary

Fixes #{issue_number}.

{2-4 bullet points describing what was changed and why.}

## Changes

{List each file changed with a one-line description of the change.}

## Test plan

- [ ] Local build passes
- [ ] Template tests pass (if templates were changed)
- [ ] CI passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

Note the PR number from the output — you will need it in Step 8.

## Step 8: Watch CI and Fix Any Failures

1. Wait for CI checks to start (give it ~30 seconds after push):
   ```bash
   sleep 30
   ```

2. Watch the PR checks:
   ```bash
   gh pr checks {pr_number} --repo SharePoint/spfx --watch --interval 30
   ```

3. **If CI passes**: Report success — you are done. Provide the PR URL to the user.

4. **If CI fails**, enter the fix loop:

   a. Get the failing run ID:
      ```bash
      gh run list --branch fix/issue-{issue_number} --repo SharePoint/spfx --limit 1 --json databaseId,conclusion --jq '.[0].databaseId'
      ```

   b. Get the failure logs:
      ```bash
      gh run view {run_id} --repo SharePoint/spfx --log-failed
      ```

   c. Analyze the logs carefully:
      - Identify the exact error message and which step/job failed
      - Determine whether the failure is caused by your changes or is a pre-existing unrelated issue
      - **If pre-existing/unrelated**: Stop and report to the user — do not attempt to fix issues outside the scope of this PR
      - **If caused by your changes**: Diagnose and fix

   d. Fix the issue:
      - Make the necessary code changes
      - Run the relevant local build/test to confirm the fix works
      - Commit with a clear message referencing what CI failure was fixed
      - Push: `git push`

   e. Go back to step 2 and watch CI again. Repeat until all checks pass.

## Step 9: Final Report

Once CI is green, output a summary:

```
✅ Issue #{issue_number} fixed and CI passing

Branch: fix/issue-{issue_number}
PR: {pr_url}

Changes made:
- {file 1}: {what changed}
- {file 2}: {what changed}

CI Status: ✅ All checks passing

The PR is ready for review.
```

---

## Important Notes for This Repository

- **Templates vs Examples**: Files under `templates/` are the source of truth; files under `examples/` are generated output and must stay in sync
- **Never merge the PR** — only humans should merge
- **Commit attribution**: Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in commit messages
- **Staging files**: Stage specific files by name rather than `git add -A` to avoid accidentally including unintended files
- **Style patterns**: When fixing a template inconsistency, look at sibling templates to confirm what the canonical correct pattern is
