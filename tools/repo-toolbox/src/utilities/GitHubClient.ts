// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { Octokit, RestEndpointMethodTypes } from '@octokit/rest';

import type { ITerminal } from '@rushstack/terminal';

import { getGitHubAuthorizationHeaderAsync, getRepoSlugAsync } from './GitUtilities';

export type IGitHubPr = RestEndpointMethodTypes['pulls']['list']['response']['data'][number];
export type IGitHubCreationResult = RestEndpointMethodTypes['pulls']['create']['response']['data'];
export type ICommitPr =
  RestEndpointMethodTypes['repos']['listPullRequestsAssociatedWithCommit']['response']['data'][number];

export interface IGitHubAuthorizationHeader {
  header: string;
}

export interface IGitHubClientOptions {
  authorizationHeader: IGitHubAuthorizationHeader;
  repoSlug: string;
}

export interface IGetPrForBranchOptions {
  branchName: string;
}

export interface IOpenPrOptions {
  title: string;
  body: string;
  branchName: string;
  baseBranch: string;
}

export interface IUpdatePrDescriptionOptions {
  prNumber: number;
  title: string;
  body: string;
}

export interface IPostCommitStatusOptions {
  sha: string;
  state: 'pending' | 'success' | 'failure' | 'error';
  context: string;
  description?: string;
  targetUrl?: string;
}

export interface ICreateReleaseOptions {
  tag: string;
  sha: string;
  name: string;
  body?: string;
  prerelease: boolean;
}

interface IOctokitCommonOptions {
  owner: string;
  repo: string;
}

interface IGitHubClientOptionsInternal extends IGitHubClientOptions {
  Octokit: typeof Octokit;
}

/**
 * Normalizes various token formats to a proper GitHub API Authorization header value.
 *
 * Git checkout extraheaders use `basic base64(x-access-token:ghs_xxx)`, which GitHub
 * App installation tokens don't support — they require `token ghs_xxx`.
 */
export function parseGitHubAuthorizationHeader(value: string): IGitHubAuthorizationHeader {
  value = value.trim();
  const spaceIndex: number = value.indexOf(' ');

  // Default: pass through unchanged (already "token xxx", "bearer xxx", etc.)
  let header: string = value;

  if (spaceIndex === -1) {
    // Raw token with no scheme prefix
    header = `token ${value}`;
  } else {
    const scheme: string = value.substring(0, spaceIndex);
    const encoded: string = value.substring(spaceIndex + 1);
    if (scheme.toLowerCase() === 'basic') {
      const decoded: string = Buffer.from(encoded, 'base64').toString('utf8');
      const colonIndex: number = decoded.indexOf(':');
      const usernameOrHeaderName: string = decoded.substring(0, colonIndex);
      const token: string = decoded.substring(colonIndex + 1);
      if (colonIndex !== -1 && usernameOrHeaderName.toLowerCase() === 'x-access-token' && token) {
        header = `token ${token}`;
      }
    }
  }

  return { header };
}

export class GitHubClient {
  private readonly _octokit: Octokit;
  private readonly _octokitCommonOptions: IOctokitCommonOptions;

  private constructor(options: IGitHubClientOptionsInternal) {
    const {
      authorizationHeader: { header },
      repoSlug,
      Octokit
    } = options;
    const [owner, repo, ...extraParts] = repoSlug.split('/');
    if (!owner || !repo || extraParts.length > 0) {
      throw new Error(`Unable to determine repository owner/name from slug: ${repoSlug}`);
    }

    this._octokitCommonOptions = { owner, repo };

    this._octokit = new Octokit();
    this._octokit.hook.before('request', (requestOptions) => {
      requestOptions.headers.authorization = header;
    });
  }

  /**
   * Creates a {@link GitHubClient} by reading the repository slug and authorization
   * header from the local git configuration.
   */
  public static async createGitHubClientAsync(terminal: ITerminal): Promise<GitHubClient> {
    const [repoSlug, authorizationHeader] = await Promise.all([
      getRepoSlugAsync(terminal),
      getGitHubAuthorizationHeaderAsync(terminal)
    ]);
    return await GitHubClient.createGitHubClientFromTokenAndRepoSlugAsync({ authorizationHeader, repoSlug });
  }

  /**
   * Creates a {@link GitHubClient} from an explicit GitHub Authorization header value
   * and repository slug, without requiring a local git checkout.
   *
   * @param options.authorizationHeader - The full HTTP Authorization header value,
   *   e.g. `basic <base64>` as emitted by {@link EmitGitHubVarsAndTagBuildAction}.
   */
  public static async createGitHubClientFromTokenAndRepoSlugAsync(
    options: IGitHubClientOptions
  ): Promise<GitHubClient> {
    const { Octokit } = await import('@octokit/rest');
    return new GitHubClient({ ...options, Octokit });
  }

  public async getPrForBranchAsync(options: IGetPrForBranchOptions): Promise<IGitHubPr | undefined> {
    const { branchName } = options;
    const { data } = await this._octokit.pulls.list({
      ...this._octokitCommonOptions,
      head: `${this._octokitCommonOptions.owner}:${branchName}`,
      state: 'open'
    });
    return data[0];
  }

  public async openPrAsync(options: IOpenPrOptions): Promise<IGitHubCreationResult> {
    const { title, body, branchName, baseBranch } = options;
    const { data } = await this._octokit.pulls.create({
      ...this._octokitCommonOptions,
      title,
      body,
      head: branchName,
      base: baseBranch
    });
    return data;
  }

  /**
   * Finds the merged pull request that produced the specified merge commit SHA.
   *
   * The GitHub API returns all PRs whose branch contains the commit, which
   * includes open PRs. We filter to the PR whose `merge_commit_sha` matches
   * exactly, ensuring we identify the PR that was merged to create this commit.
   */
  public async getMergedPrForCommitAsync(commitSha: string): Promise<ICommitPr | undefined> {
    const { data } = await this._octokit.repos.listPullRequestsAssociatedWithCommit({
      ...this._octokitCommonOptions,
      commit_sha: commitSha
    });
    return data.find((pr) => pr.merge_commit_sha === commitSha);
  }

  public async postCommitStatusAsync(options: IPostCommitStatusOptions): Promise<void> {
    const { sha, state, context, description, targetUrl } = options;
    await this._octokit.repos.createCommitStatus({
      ...this._octokitCommonOptions,
      sha,
      state,
      context,
      description,
      target_url: targetUrl
    });
  }

  public async updatePrDescriptionAsync(options: IUpdatePrDescriptionOptions): Promise<void> {
    const { prNumber, title, body } = options;
    await this._octokit.pulls.update({
      ...this._octokitCommonOptions,
      pull_number: prNumber,
      title,
      body
    });
  }

  public async createReleaseAsync(options: ICreateReleaseOptions): Promise<void> {
    const { tag, sha, name, body, prerelease } = options;
    await this._octokit.repos.createRelease({
      ...this._octokitCommonOptions,
      tag_name: tag,
      target_commitish: sha,
      name,
      body,
      draft: false,
      prerelease
    });
  }
}
