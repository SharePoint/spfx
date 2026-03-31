# Branching and Release Strategy

This document describes how branches map to SPFx versions, how the CLI resolves
templates, and how hotfixes are managed across release branches.

---

## Branch naming convention

| SPFx version | Branch | Description |
|--------------|--------|-------------|
| Latest stable | `main` | Always tracks the most recent stable SPFx release. |
| Named stable release | `release/X.Y.Z` (e.g. `release/1.22.0`) | Created at GA for each SPFx version. |
| Beta pre-release | `release/X.Y.Z-beta.N` (e.g. `release/1.23.0-beta.1`) | Created when a beta ships. |
| RC pre-release | `release/X.Y.Z-rc.N` (e.g. `release/1.23.0-rc.1`) | Created when an RC ships. |

The `release/` prefix keeps the branch list organized and avoids collisions with
tags or other ref names.

---

## How the CLI resolves a branch

The CLI downloads templates from GitHub using the
[`PublicGitHubRepositorySource`](../../api/spfx-template-api/src/repositories/PublicGitHubRepositorySource.ts)
class. The download URL follows this pattern:

```
https://codeload.github.com/{owner}/{repo}/zip/{ref}
```

### Default behavior

When no `--spfx-version` flag is provided, the CLI fetches from the **`main`
branch**. Because `main` always tracks the latest stable release, users get
up-to-date templates without specifying a version.

### Selecting a specific version

The planned `--spfx-version` CLI flag maps directly to a release branch:

```bash
# Fetches templates from the release/1.22.0 branch
spfx create --template webpart-minimal --spfx-version 1.22.0 ...

# Fetches templates from the release/1.23.0-beta.1 branch
spfx create --template webpart-minimal --spfx-version 1.23.0-beta.1 ...
```

The CLI prepends `release/` to the provided version string and passes it as the
`branch` parameter to `PublicGitHubRepositorySource`.

### Local override

For full control (custom templates, offline work, or development), use
`--local-template` to point to a directory on disk. This bypasses GitHub entirely.

---

## Lifecycle of a release branch

### Creating a release branch

When a new SPFx version ships:

1. Create a branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b release/X.Y.Z
   ```
2. Update `spfxVersion` in every `template.json` to match the new SPFx version.
3. Regenerate all examples from templates.
4. Verify examples build: `rush build`.
5. Push the branch and configure branch protection (require PR reviews, CI must
   pass).

After the release branch is created, `main` continues forward — it is always the
latest stable.

### Pre-release branches

Beta and RC branches follow the same process. They are created from `main` (or
from the prior pre-release branch) when the pre-release ships:

```
main ──────────────────────────────── (latest stable)
  └── release/1.23.0-beta.1           (created at beta)
        └── release/1.23.0-rc.1       (created at RC)
              └── release/1.23.0       (created at GA)
```

Once the GA branch (`release/1.23.0`) is created, `main` is updated to reflect
that version as the new latest stable.

### Private development

Templates for unreleased SPFx versions are developed in a private repo. Branches
are synced to this public repo during each SPFx release.

---

## Hotfix and cherry-pick workflow

When a fix needs to be applied to older template versions (e.g. a security
vulnerability in a dependency, a broken template pattern):

1. **Fix on `main` first.** Land the fix via a normal PR to `main`.
2. **Identify affected release branches.** Determine which active release branches
   contain the issue.
3. **Cherry-pick to each affected branch:**
   ```bash
   git checkout release/1.22.0
   git cherry-pick <commit-sha>
   ```
4. **Open a PR for each release branch.** Each cherry-pick goes through the same
   review and CI process as any other change.
5. **Verify the fix.** Ensure templates build and tests pass on each branch.

### Which branches are actively maintained?

At any given time, the following branches receive hotfixes:

- **`main`** — always maintained.
- **The latest GA release branch** — maintained until the next GA ships.
- **Any active pre-release branch** (beta, RC) — maintained until GA ships.

Older release branches are not actively maintained but remain available for users
who need templates for a specific SPFx version.

---

## Branch protection

Release branches should have the following protections enabled:

- Require pull request reviews before merging.
- Require CI status checks to pass before merging.
- No direct pushes — all changes go through PRs.

---

## Summary

| Question | Answer |
|----------|--------|
| What does the CLI fetch by default? | The `main` branch (latest stable). |
| How does `--spfx-version` change the branch? | It maps to `release/{version}` (e.g. `release/1.22.0`). |
| What branch is stable? | `main` is always the latest stable. Named stable releases live under `release/X.Y.Z`. |
| What branch is beta? | `release/X.Y.Z-beta.N` (e.g. `release/1.23.0-beta.1`). |
| How are hotfixes applied? | Fix on `main`, then cherry-pick to affected release branches via PRs. |
