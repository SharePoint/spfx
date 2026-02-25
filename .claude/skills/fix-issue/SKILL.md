---
name: fix-issue
description: Fix a GitHub issue end-to-end
argument-hint: <issue-number>
---

# Fix Issue

Automates the complete workflow for fixing a GitHub issue, from investigation through a merge-ready PR with passing CI.

## What This Skill Does

1. Checks out latest `main` and creates a `fix/issue-{number}` branch
2. Launches parallel subagents to deeply investigate the issue and the relevant codebase
3. Enters plan mode — you review and approve the proposed changes before anything is written
4. Implements the fix following repository patterns
5. Builds and tests locally (loops until passing)
6. Commits and pushes, then opens a PR that closes the issue
7. Watches CI and automatically diagnoses and fixes any failures, looping until all checks pass

## Usage

```bash
/fix-issue <issue-number>
```

Example:
```bash
/fix-issue 43
```

## Parameters

| Parameter    | Type   | Required | Description                   |
|--------------|--------|----------|-------------------------------|
| issue_number | number | yes      | GitHub issue number to fix    |

## Branch Naming

The skill always creates a branch named `fix/issue-{number}` off the latest `main`.

## CI Loop Behavior

If CI fails after the PR is opened, the skill will:
1. Fetch the failure logs
2. Diagnose whether the failure is caused by the PR's changes
3. If yes: fix, commit, push, and re-watch CI
4. If the failure is pre-existing and unrelated: stop and report to you

The skill will **not** attempt to fix CI failures that are outside the scope of the issue being fixed.

## What It Will Not Do

- Merge the PR (humans only)
- Fix CI failures caused by unrelated pre-existing issues
- Make changes beyond what is described in the approved plan

## Notes

- Requires `gh` CLI to be authenticated
- All commits include Claude co-authorship attribution
