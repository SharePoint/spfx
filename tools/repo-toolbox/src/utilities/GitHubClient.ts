// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';

import type { ITerminal } from '@rushstack/terminal';

import { getGitAuthorizationHeaderAsync, getRepoSlugAsync } from './GitUtilities';

export type IGitHubPr = RestEndpointMethodTypes['pulls']['list']['response']['data'][number];
export type IGitHubCreationResult = RestEndpointMethodTypes['pulls']['create']['response']['data'];

export interface IGitHubClientOptions {
  authorizationHeader: string;
  owner: string;
  repo: string;
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

interface IOctokitCommonOptions {
  owner: string;
  repo: string;
}

export class GitHubClient {
  private readonly _octokit: Octokit;
  private readonly _octokitCommonOptions: IOctokitCommonOptions;

  public constructor(options: IGitHubClientOptions) {
    const { authorizationHeader, owner, repo } = options;
    this._octokitCommonOptions = { owner, repo };

    this._octokit = new Octokit();
    this._octokit.hook.before('request', (requestOptions) => {
      requestOptions.headers.authorization = authorizationHeader;
    });
  }

  /**
   * Creates a {@link GitHubClient} by reading the repository slug and authorization
   * header from the local git configuration.
   */
  public static async createGitHubClientAsync(terminal: ITerminal): Promise<GitHubClient> {
    const repoSlug: string = await getRepoSlugAsync(terminal);
    const [owner, repo] = repoSlug.split('/');
    if (!owner || !repo) {
      throw new Error(`Unable to determine repository owner/name from slug: ${repoSlug}`);
    }

    const authorizationHeader: string = await getGitAuthorizationHeaderAsync(terminal);
    return new GitHubClient({ authorizationHeader, owner, repo });
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

  public async updatePrDescriptionAsync(options: IUpdatePrDescriptionOptions): Promise<void> {
    const { prNumber, title, body } = options;
    await this._octokit.pulls.update({
      ...this._octokitCommonOptions,
      pull_number: prNumber,
      title,
      body
    });
  }
}
