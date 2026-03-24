// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

export const DEFAULT_GITHUB_REPO: string = 'https://github.com/SharePoint/spfx';
export const SPFX_TEMPLATE_REPO_URL_ENV_VAR_NAME: string = 'SPFX_TEMPLATE_REPO_URL';

/**
 * Parses a GitHub (or GHE) URL that may contain a `/tree/<ref>` path segment.
 * Returns the clean repository URL (without `.git` or trailing slashes) and the optional branch ref.
 */
export function parseGitHubUrlAndRef(rawUrl: string): { repoUrl: string; urlBranch: string | undefined } {
  const normalized: string = rawUrl.trim().replace(/\/+$/, '');
  // Match https://<host>/owner/repo[.git]/tree/<ref> — host-agnostic to support GHE.
  // Only the first path segment after /tree/ is captured as the ref. This means branch
  // names containing slashes (e.g. `feature/foo`) cannot be expressed via a /tree/ URL;
  // use the --spfx-version flag to specify such refs directly.
  const treeMatch: RegExpMatchArray | null = normalized.match(
    /^(?<repo>https?:\/\/[^/]+\/[^/]+\/[^/]+?)(?:\.git)?\/tree\/(?<ref>[^/]+)/
  );
  if (treeMatch?.groups) {
    const { repo, ref } = treeMatch.groups as { repo: string; ref: string };
    return { repoUrl: repo, urlBranch: ref };
  }
  return { repoUrl: normalized.replace(/\.git$/, ''), urlBranch: undefined };
}
