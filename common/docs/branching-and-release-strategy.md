# Branching and Release Strategy

This document describes how branches map to SPFx versions, how the CLI resolves
templates, and how hotfixes are managed across release branches.

---

## Branch naming convention

| SPFx version | Branch | Description |
|--------------|--------|-------------|
| Latest stable | `version/latest` | Tracks the most recent stable SPFx release. **This is the CLI default.** |
| Latest beta | `version/latest-beta` | Tracks the most recent beta/pre-release. |
| Named stable release | `version/X.Y.Z` (e.g. `version/1.22.2`) | Created at GA for each SPFx version. |
| Beta pre-release | `version/X.Y.Z-beta.N` (e.g. `version/1.23.0-beta.0`) | Created when a beta ships. |
| RC pre-release | `version/X.Y.Z-rc.N` (e.g. `version/1.23.0-rc.1`) | Created when an RC ships. |
| Development | `main` | Active development branch. |

The `version/` prefix keeps release branches organized and avoids collisions with
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

When no `--spfx-version` flag is provided, the CLI fetches from the
**`version/latest`** branch. This branch always points to the most recent stable
SPFx release, so users get up-to-date templates without specifying a version.

### Selecting a specific version

The `--spfx-version` flag maps to a `version/` branch. The CLI prepends `version/`
to the provided string (unless it already starts with `version/`) and passes it as
the `branch` parameter to `PublicGitHubRepositorySource`:

```bash
# Fetches templates from the version/1.22.2 branch
spfx create --template webpart-minimal --spfx-version 1.22.2 ...

# Fetches templates from the version/1.23.0-beta.0 branch
spfx create --template webpart-minimal --spfx-version 1.23.0-beta.0 ...

# Fetches templates from the version/latest-beta branch
spfx create --template webpart-minimal --spfx-version latest-beta ...
```

### Local override

For full control (custom templates, offline work, or development), use
`--local-source` to point to a directory on disk. This bypasses GitHub entirely.
When `--local-source` is provided on the `create` command, `--spfx-version` is
ignored.

---

## Lifecycle of a release branch

### Creating a release branch

When a new SPFx version ships:

1. Create a branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b version/X.Y.Z
   ```
2. Update `spfxVersion` in every `template.json` to match the new SPFx version.
3. Regenerate all examples from templates.
4. Verify examples build: `rush build`.
5. Push the branch and configure branch protection (require PR reviews, CI must
   pass).
6. Update the `version/latest` branch to point to the same commit (for stable
   releases) or update `version/latest-beta` (for pre-releases).

### Rolling branches

Two special branches track the latest of each release type:

- **`version/latest`** — updated to match the newest GA release branch.
- **`version/latest-beta`** — updated to match the newest beta or RC branch.

These are the branches the CLI resolves by default (`version/latest`) or when
a user passes `--spfx-version latest-beta`.

### Pre-release branches

Beta and RC branches follow the same process. They are created from `main` (or
from the prior pre-release branch) when the pre-release ships:

```
main ──────────────────────────────── (development)
  └── version/1.23.0-beta.0           (created at beta)
        └── version/1.23.0-rc.1       (created at RC)
              └── version/1.23.0       (created at GA)
```

When the GA branch (`version/1.23.0`) is created, `version/latest` is updated to
match it.

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
   git checkout version/1.22.2
   git cherry-pick <commit-sha>
   ```
4. **Open a PR for each release branch.** Each cherry-pick goes through the same
   review and CI process as any other change.
5. **Verify the fix.** Ensure templates build and tests pass on each branch.
6. **Update rolling branches.** If the fix applies to `version/latest` or
   `version/latest-beta`, ensure those branches are updated as well.

### Which branches are actively maintained?

At any given time, the following branches receive hotfixes:

- **`main`** — always maintained.
- **`version/latest`** — always maintained (tracks latest GA).
- **`version/latest-beta`** — maintained when a beta or RC is active.
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
| What does the CLI fetch by default? | The `version/latest` branch (latest stable). |
| How does `--spfx-version` change the branch? | It maps to `version/{value}` (e.g. `version/1.22.2`). |
| What branch is stable? | `version/latest` tracks the latest GA. Named releases live under `version/X.Y.Z`. |
| What branch is beta? | `version/latest-beta` tracks the latest pre-release. Named betas live under `version/X.Y.Z-beta.N`. |
| How are hotfixes applied? | Fix on `main`, then cherry-pick to affected version branches via PRs. |
