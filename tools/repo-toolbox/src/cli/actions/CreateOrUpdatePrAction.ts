// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import type {
  IRequiredCommandLineIntegerParameter,
  IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';

import { GitHubClient, type IGitHubPr } from '../../utilities/GitHubClient';
import { execGitAsync } from '../../utilities/GitUtilities';
import { AzDoPipelineAction } from './AzDoPipelineAction';

export class CreateOrUpdatePrAction extends AzDoPipelineAction {
  private readonly _branchNameParameter: IRequiredCommandLineStringParameter;
  private readonly _baseBranchParameter: IRequiredCommandLineStringParameter;
  private readonly _titleParameter: IRequiredCommandLineStringParameter;
  private readonly _bodyParameter: IRequiredCommandLineStringParameter;
  private readonly _statusContextParameter: IRequiredCommandLineStringParameter;
  private readonly _buildIdParameter: IRequiredCommandLineIntegerParameter;

  public constructor(terminal: ITerminal) {
    super(terminal, {
      actionName: 'create-or-update-pr',
      summary: 'Creates or updates a pull request for the repository. To be used only on AzDO pipelines.',
      documentation: ''
    });

    this._branchNameParameter = this.defineStringParameter({
      parameterLongName: '--branch-name',
      argumentName: 'BRANCH',
      description: 'The source branch for the pull request',
      required: true
    });

    this._baseBranchParameter = this.defineStringParameter({
      parameterLongName: '--base-branch',
      argumentName: 'BRANCH',
      description: 'The target branch for the pull request',
      defaultValue: 'main'
    });

    this._titleParameter = this.defineStringParameter({
      parameterLongName: '--title',
      argumentName: 'TITLE',
      description: 'The pull request title',
      required: true,
      environmentVariable: 'PR_TITLE'
    });

    this._bodyParameter = this.defineStringParameter({
      parameterLongName: '--body',
      argumentName: 'BODY',
      description: 'The pull request body',
      defaultValue: '',
      environmentVariable: 'PR_BODY'
    });

    this._statusContextParameter = this.defineStringParameter({
      parameterLongName: '--status-context',
      argumentName: 'CONTEXT',
      description:
        'Posts a pending GitHub commit status with this context string and emits it ' +
        'as the StatusContext AzDO output variable for use by downstream stages.',
      required: true
    });

    this._buildIdParameter = this.defineIntegerParameter({
      parameterLongName: '--build-id',
      argumentName: 'ID',
      description: 'The AzDO build ID, used to build the pipeline run target URL.',
      required: true,
      environmentVariable: 'BUILD_BUILDID'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const gitHubClient: GitHubClient = await GitHubClient.createGitHubClientAsync(terminal);

    // Check for existing open PR from this branch
    const branchName: string = this._branchNameParameter.value;
    const existingPr: IGitHubPr | undefined = await gitHubClient.getPrForBranchAsync({ branchName });

    const title: string = this._titleParameter.value;
    const body: string = this._bodyParameter.value;

    let prNumber: number;
    if (existingPr) {
      ({ number: prNumber } = existingPr);
      terminal.writeLine(`Updating existing PR #${prNumber}`);
      await gitHubClient.updatePrDescriptionAsync({ prNumber, title, body });
      terminal.writeLine(`PR #${prNumber} updated.`);
    } else {
      terminal.writeLine('Creating new PR');
      const baseBranch: string = this._baseBranchParameter.value;
      ({ number: prNumber } = await gitHubClient.openPrAsync({ title, body, branchName, baseBranch }));
      terminal.writeLine(`Created PR #${prNumber}`);
    }

    const statusContext: string = this._statusContextParameter.value;
    const sha: string = await execGitAsync(['rev-parse', 'HEAD'], terminal);
    const collectionUri: string = this._collectionUriParameter.value;
    const teamProject: string = this._teamProjectParameter.value;
    const buildId: number = this._buildIdParameter.value;
    const targetUrl: string = `${collectionUri}${teamProject}/_build/results?buildId=${buildId}`;

    await gitHubClient.postCommitStatusAsync({
      sha,
      state: 'pending',
      context: statusContext,
      description: 'Bump versions pipeline in progress',
      targetUrl
    });
    terminal.writeLine(`Posted pending commit status (context: ${statusContext})`);

    terminal.writeLine(`##vso[task.setvariable variable=StatusContext;isOutput=true]${statusContext}`);
  }
}
