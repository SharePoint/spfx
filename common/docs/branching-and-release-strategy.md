# Branching and Release Strategy

This document describes how branches map to SPFx versions, how the CLI resolves
templates, and how hotfixes are managed across release branches.

---

## Branch naming convention

| SPFx version | Branch | Description |
|--------------|--------|-------------|
| Latest stable | `version/latest` | Tracks the most recent stable SPFx release. **This is the CLI default.** |
| Next pre-release | `version/next` | Tracks the most recent pre-release (beta or RC). |
| Named stable release | `version/X.Y` (e.g. `version/1.22`) | Created at GA for each SPFx minor version. |
| Named pre-release | `version/X.Y.Z-beta.N` or `version/X.Y.Z-rc.N` | Tags (not branches) created for each pre-release. |
| Development | `main` | Active development branch. |

The `version/` prefix keeps release branches organized and avoids collisions with
tags or other ref names. Note that the branch ruleset configured for `main` also
applies to all `version/*` branches.

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
# Fetches templates from the version/1.22 branch
spfx create --template webpart-minimal --spfx-version 1.22 ...

# Fetches templates from the version/1.23.0-beta.0 branch
spfx create --template webpart-minimal --spfx-version 1.23.0-beta.0 ...

# Fetches templates from the version/next branch
spfx create --template webpart-minimal --spfx-version next ...
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
   git checkout -b version/X.Y
   ```
2. Update `spfxVersion` in every `template.json` to match the new SPFx version.
3. Regenerate all examples from templates.
4. Verify examples build: `rush build`.
5. Push the branch (branch protection is automatically applied via the `version/*`
   ruleset).
6. Update the `version/latest` branch to point to the same commit (for stable
   releases) or update `version/next` (for pre-releases).

### Rolling branches

Two special branches track the latest of each release type:

- **`version/latest`** — updated to match the newest GA release branch.
- **`version/next`** — updated to match the newest beta or RC branch.

These are the branches the CLI resolves by default (`version/latest`) or when
a user passes `--spfx-version next`.

### Pre-release branches

Beta and RC branches follow the same process. They are created from `main` (or
from the prior pre-release branch) when the pre-release ships:

```
main ──────────────────────────────── (development)
  └── version/1.23                     (created at first pre-release)
        tag: version/1.23.0-beta.0    (tagged at beta)
        tag: version/1.23.0-rc.1      (tagged at RC)
        tag: version/1.23.0           (tagged at GA)
```

When the GA tag is created, `version/latest` is updated to match the branch.

### Private development

Templates for unreleased SPFx versions are developed in a private repo. Branches
are synced to this public repo during each SPFx release.

---

## Hotfix and cherry-pick workflow

When a fix needs to be applied to older template versions (e.g. a security
vulnerability or a broken template pattern):

> **Note:** Routine dependency bumps on `main` or `version/latest` are not
> backported to older release branches. Most dependencies are transitive through
> the SDK and Heft, so older branches only receive targeted fixes (security
> patches, broken templates).

1. **Fix on `main` first.** Land the fix via a normal PR to `main`.
2. **Identify affected release branches.** Determine which active release branches
   contain the issue.
3. **Cherry-pick to each affected branch:**
   ```bash
   git checkout version/1.22
   git cherry-pick <commit-sha>
   ```
4. **Open a PR for each release branch.** Each cherry-pick goes through the same
   review and CI process as any other change.
5. **Verify the fix.** Ensure templates build and tests pass on each branch.
6. **Update rolling branches.** If the fix applies to `version/latest` or
   `version/next`, ensure those branches are updated as well.

### Which branches are actively maintained?

At any given time, the following branches receive hotfixes:

- **`main`** — always maintained.
- **`version/latest`** — always maintained (tracks latest GA).
- **`version/next`** — maintained when a beta or RC is active.
- **The latest GA release branch** — maintained until the next GA ships.
- **Any active pre-release branch** (beta, RC) — maintained until GA ships.

Older release branches are not actively maintained but remain available for users
who need templates for a specific SPFx version.

---

## Branch protection

Branch protection is automatically configured for `main` and all `version/*`
branches via a repository ruleset. The following protections are enforced:

- Require pull request reviews before merging.
- Require conversation resolution before merging.
- Require CI status checks to pass before merging.
- No direct pushes — all changes go through PRs.

---

## Summary

| Question | Answer |
|----------|--------|
| What does the CLI fetch by default? | The `version/latest` branch (latest stable). |
| How does `--spfx-version` change the branch? | It maps to `version/{value}` (e.g. `version/1.22`). |
| What branch is stable? | `version/latest` tracks the latest GA. Named releases live under `version/X.Y`. |
| What branch is pre-release? | `version/next` tracks the latest pre-release. Individual pre-releases are tagged (e.g. `version/1.23.0-beta.0`). |
| How are hotfixes applied? | Fix on `main`, then cherry-pick to affected version branches via PRs. |
