// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { Async } from '@rushstack/node-core-library';

export interface IGitHubPr {
  number: number;
}

export interface IGitHubLabel {
  name: string;
}

export interface IGitHubGetRequestOptions {
  url: string;
}

export interface IGitHubRequestOptions extends IGitHubGetRequestOptions {
  jsonBody?: object;
  method: string;
}

export interface IGitHubClientOptions {
  authorizationHeader: string;
  repoSlug: string;
}

export interface IGetPrForBranchOptions {
  owner: string;
  branchName: string;
}

export interface IOpenPrOptions {
  title: string;
  body: string;
  branchName: string;
  baseBranch: string;
}

export interface IAddPrLabelOptions {
  prNumber: number;
  labelName: string;
}

export interface IDeletePrLabelOptions {
  prNumber: number;
  labelName: string;
}

export interface IUpdatePrDescriptionOptions {
  prNumber: number;
  title: string;
  body: string;
}

const AUTHORIZATION_HEADER_NAME: 'Authorization' = 'Authorization';
const COMMON_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

export class GitHubClient {
  private readonly _authorizationHeader: string;
  private readonly _apiBase: string;

  public constructor(options: IGitHubClientOptions) {
    const { authorizationHeader, repoSlug } = options;
    this._authorizationHeader = authorizationHeader;
    this._apiBase = `https://api.github.com/repos/${repoSlug}`;
  }

  public async getPrForBranchAsync(options: IGetPrForBranchOptions): Promise<IGitHubPr | undefined> {
    const { owner, branchName } = options;
    const [existingPr]: IGitHubPr[] = await this.githubGetAsync<IGitHubPr[]>({
      url: `${this._apiBase}/pulls?head=${encodeURIComponent(`${owner}:${branchName}`)}&state=open`
    });

    return existingPr;
  }

  public async openPrAsync(options: IOpenPrOptions): Promise<IGitHubPr> {
    const { title, body, branchName, baseBranch } = options;
    return await this.githubRequestAsync<IGitHubPr>({
      url: `${this._apiBase}/pulls`,
      method: 'POST',
      jsonBody: {
        title,
        body,
        head: branchName,
        base: baseBranch
      }
    });
  }

  public async getPrLabelsAsync(prNumber: number): Promise<IGitHubLabel[]> {
    return await this.githubGetAsync<IGitHubLabel[]>({
      url: `${this._apiBase}/issues/${prNumber}/labels`
    });
  }

  public async addPrLabelAsync(options: IAddPrLabelOptions): Promise<void> {
    const { prNumber, labelName } = options;
    await this.githubRequestAsync({
      url: `${this._apiBase}/issues/${prNumber}/labels`,
      method: 'POST',
      jsonBody: { labels: [labelName] }
    });
  }

  public async deletePrLabelAsync(options: IDeletePrLabelOptions): Promise<void> {
    const { prNumber, labelName } = options;
    const encodedLabel: string = encodeURIComponent(labelName);
    await this.githubRequestAsync({
      url: `${this._apiBase}/issues/${prNumber}/labels/${encodedLabel}`,
      method: 'DELETE'
    });
  }

  public async updatePrDescriptionAsync(options: IUpdatePrDescriptionOptions): Promise<void> {
    const { prNumber, title, body } = options;
    await this.githubRequestAsync({
      url: `${this._apiBase}/pulls/${prNumber}`,
      method: 'PATCH',
      jsonBody: {
        title,
        body
      }
    });
  }

  public async githubGetAsync<TResponse>(options: IGitHubGetRequestOptions): Promise<TResponse> {
    return await this.githubRequestAsync<TResponse>({ ...options, method: 'GET' });
  }

  public async githubRequestAsync(options: IGitHubRequestOptions & { method: 'DELETE' }): Promise<undefined>;
  public async githubRequestAsync<TResponse>(options: IGitHubRequestOptions): Promise<TResponse>;
  public async githubRequestAsync<T>(options: IGitHubRequestOptions): Promise<T | undefined> {
    const { url, method, jsonBody } = options;
    const requestInit: RequestInit = {
      method,
      body: JSON.stringify(jsonBody),
      headers: {
        ...COMMON_HEADERS,
        [AUTHORIZATION_HEADER_NAME]: this._authorizationHeader
      }
    };

    return await Async.runWithRetriesAsync({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      action: async () => {
        const response: Response = await fetch(url, requestInit);
        const { status, ok } = response;
        if (!ok) {
          const text: string = await response.text();
          throw new Error(`GitHub API ${method} ${url} returned ${status}: ${text}`);
        }

        if (method === 'DELETE' || status === 204) {
          return undefined;
        }

        return (await response.json()) as T;
      },
      maxRetries: 3,
      retryDelayMs: 1000
    });
  }
}
