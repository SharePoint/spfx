// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { WebApi, getBearerHandler } from 'azure-devops-node-api';
import type { IBuildApi } from 'azure-devops-node-api/BuildApi';
import {
  type Build,
  BuildQueryOrder,
  BuildResult,
  BuildStatus
} from 'azure-devops-node-api/interfaces/BuildInterfaces';

export interface IAzDoClientOptions {
  orgUrl: string;
  project: string;
  accessToken: string;
}

export interface IFindBuildByTagOptions {
  pipelineId: number;
  tag: string;
}

// eslint-disable-next-line no-bitwise
const SUCCEEDED_OR_PARTIALLY_SUCCEEDED: BuildResult = BuildResult.Succeeded | BuildResult.PartiallySucceeded;

export class AzDoClient {
  private readonly _connection: WebApi;
  private readonly _project: string;
  private _buildApi: IBuildApi | undefined;

  public constructor(options: IAzDoClientOptions) {
    const { orgUrl, project, accessToken } = options;
    this._project = project;
    this._connection = new WebApi(orgUrl, getBearerHandler(accessToken));
  }

  /**
   * Finds the most recent successful completed build for the specified pipeline
   * definition that has the given tag.
   *
   * @returns The matching build, or `undefined` if no build was found.
   */
  public async findLatestBuildByTagAsync(options: IFindBuildByTagOptions): Promise<Build | undefined> {
    const { pipelineId, tag } = options;
    const buildApi: IBuildApi = await this._getBuildApiAsync();

    const builds: Build[] = await buildApi.getBuilds(
      this._project,
      /* definitions */ [pipelineId],
      /* queues */ undefined,
      /* buildNumber */ undefined,
      /* minTime */ undefined,
      /* maxTime */ undefined,
      /* requestedFor */ undefined,
      /* reasonFilter */ undefined,
      /* statusFilter */ BuildStatus.Completed,
      /* resultFilter */ SUCCEEDED_OR_PARTIALLY_SUCCEEDED,
      /* tagFilters */ [tag],
      /* properties */ undefined,
      /* top */ 1,
      /* continuationToken */ undefined,
      /* maxBuildsPerDefinition */ undefined,
      /* deletedFilter */ undefined,
      /* queryOrder */ BuildQueryOrder.FinishTimeDescending
    );

    return builds[0];
  }

  private async _getBuildApiAsync(): Promise<IBuildApi> {
    if (!this._buildApi) {
      this._buildApi = await this._connection.getBuildApi();
    }

    return this._buildApi;
  }
}
