// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

export interface IGitHubPr {
  number: number;
}

export interface IGitHubLabel {
  name: string;
}

export interface IGitHubGetRequestOptions {
  url: string;
  authHeader: string;
}

export interface IGitHubRequestOptions extends IGitHubGetRequestOptions {
  jsonBody?: object;
  method: string;
}

const AUTHORIZATION_HEADER_NAME: 'Authorization' = 'Authorization';
const COMMON_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

export async function githubGetAsync<TResponse>(options: IGitHubGetRequestOptions): Promise<TResponse> {
  return await githubRequestAsync<TResponse>({ ...options, method: 'GET' });
}

export async function githubRequestAsync<TResponse>(options: IGitHubRequestOptions): Promise<TResponse>;
export async function githubRequestAsync(
  options: IGitHubRequestOptions & { method: 'DELETE' }
): Promise<undefined>;
export async function githubRequestAsync<T>(options: IGitHubRequestOptions): Promise<T | undefined> {
  const { url, method, jsonBody, authHeader } = options;
  const response: Response = await fetch(url, {
    method,
    body: JSON.stringify(jsonBody),
    headers: {
      ...COMMON_HEADERS,
      [AUTHORIZATION_HEADER_NAME]: authHeader
    }
  });
  const { status, ok } = response;
  if (!ok) {
    const text: string = await response.text();
    throw new Error(`GitHub API ${method} ${url} returned ${status}: ${text}`);
  }

  if (method === 'DELETE' || status === 204) {
    return undefined;
  }

  return (await response.json()) as T;
}
