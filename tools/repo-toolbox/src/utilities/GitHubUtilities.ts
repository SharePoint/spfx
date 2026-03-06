// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

export interface IGitHubPr {
  number: number;
}

export interface IGitHubLabel {
  name: string;
}

export async function githubGetAsync<T>(url: string, headers: Record<string, string>): Promise<T> {
  return await githubRequestAsync<T>(url, { method: 'GET', headers });
}

export async function githubRequestAsync<T>(url: string, init: RequestInit): Promise<T>;
export async function githubRequestAsync(
  url: string,
  init: RequestInit & { method: 'DELETE' }
): Promise<undefined>;
export async function githubRequestAsync<T>(url: string, init: RequestInit): Promise<T | undefined> {
  const { method } = init;
  const response: Response = await fetch(url, init);
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
