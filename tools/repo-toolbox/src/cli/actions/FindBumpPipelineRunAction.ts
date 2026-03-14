// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { Build } from 'azure-devops-node-api/interfaces/BuildInterfaces';

import type { ITerminal } from '@rushstack/terminal';
import type {
  IRequiredCommandLineStringParameter,
  IRequiredCommandLineIntegerParameter
} from '@rushstack/ts-command-line';

import type { AzDoClient } from '../../utilities/AzDoClient';
import { GitHubClient, type ICommitPr } from '../../utilities/GitHubClient';
import { AzDoActionBase } from './AzDoActionBase';

const BUMP_BUILD_TAG_PREFIX: 'spfx-version-bump-sha:' = 'spfx-version-bump-sha:';

export class FindBumpPipelineRunAction extends AzDoActionBase {
  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;
  private readonly _pipelineIdParameter: IRequiredCommandLineIntegerParameter;

  public constructor(terminal: ITerminal) {
    super(terminal, {
      actionName: 'find-bump-pipeline-run',
      summary: 'If the current commit is a version bump merge, finds the originating bump pipeline run.',
      documentation:
        'Finds the merged PR for the specified commit SHA via the GitHub API, then queries the ' +
        "Azure DevOps Build API for a pipeline run tagged with the PR's head commit SHA. " +
        'Sets the AzDO output variables IsVersionBumpMerge (true/false) and BumpPipelineRunId (the build ID).'
    });

    this._commitShaParameter = this.defineStringParameter({
      parameterLongName: '--commit-sha',
      argumentName: 'SHA',
      description: 'The merge commit SHA to look up',
      required: true,
      environmentVariable: 'BUILD_SOURCEVERSION'
    });

    this._pipelineIdParameter = this.defineIntegerParameter({
      parameterLongName: '--pipeline-id',
      argumentName: 'ID',
      description: 'The pipeline definition ID of the bump versions pipeline',
      required: true
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const commitSha: string = this._commitShaParameter.value;
    terminal.writeLine(`Merge commit SHA: ${commitSha}`);

    // Step 1: Find the merged PR that produced this commit.
    terminal.writeLine('Looking up merged pull request via GitHub API...');
    const gitHubClient: GitHubClient = await GitHubClient.createGitHubClientAsync(terminal);

    const pr: ICommitPr | undefined = await gitHubClient.getMergedPrForCommitAsync(commitSha);
    if (!pr) {
      terminal.writeLine('No merged PR found for this commit. Skipping publish.');
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    terminal.writeLine(`Found merged PR #${pr.number}: "${pr.title}"`);

    // Step 2: Get the head SHA of the PR branch (the pre-squash commit tip).
    const headSha: string | undefined = pr.head?.sha;
    if (!headSha) {
      terminal.writeLine(`PR #${pr.number} has no head SHA. Skipping publish.`);
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    terminal.writeLine(`PR head SHA (pre-squash): ${headSha}`);

    // Step 3: Query AzDO for a bump pipeline run tagged with the head SHA.
    const bumpBuildTag: string = `${BUMP_BUILD_TAG_PREFIX}${headSha}`;
    const spfxVersioningPipelineId: number = this._pipelineIdParameter.value;
    terminal.writeLine(`Versioning pipeline definition ID: ${spfxVersioningPipelineId}`);
    terminal.writeLine(`Searching for build tagged "${bumpBuildTag}"...`);

    const azDoClient: AzDoClient = this._createAzDoClient();

    const build: Build | undefined = await azDoClient.findLatestBuildByTagAsync({
      pipelineId: spfxVersioningPipelineId,
      tag: bumpBuildTag
    });

    if (build?.id === undefined) {
      terminal.writeLine(`No build found tagged "${bumpBuildTag}". Skipping publish.`);
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    const { id: buildId, buildNumber = 'N/A' } = build;

    terminal.writeLine(`Found bump pipeline run: #${buildId} (build number: ${buildNumber})`);

    terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
    terminal.writeLine(`##vso[task.setvariable variable=BumpPipelineRunId;isOutput=true]${buildId}`);
  }
}
