// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { type IRequiredCommandLineStringParameter, CommandLineAction } from '@rushstack/ts-command-line';

import { execGitAsync } from '../../utilities/GitUtilities';

export class FindBumpPipelineRunAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  private readonly _commitShaParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'find-bump-pipeline-run',
      summary:
        'Checks whether the current commit is a version bump merge and, if so, outputs the originating pipeline run ID.',
      documentation:
        'Reads the commit message for the specified SHA and looks for a "SourceBuild:" trailer. ' +
        'Sets the AzDO output variables IsVersionBumpMerge (true/false) and BumpPipelineRunId (the build ID).'
    });

    this._terminal = terminal;

    this._commitShaParameter = this.defineStringParameter({
      parameterLongName: '--commit-sha',
      argumentName: 'SHA',
      description: 'The merge commit SHA to inspect',
      required: true,
      environmentVariable: 'BUILD_SOURCEVERSION'
    });
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const commitSha: string = this._commitShaParameter.value;
    terminal.writeLine(`Commit SHA: ${commitSha}`);

    // Read the commit message body for the SourceBuild trailer.
    // %b gives the body (everything after the subject line), which is where
    // GitHub places the PR description content when squash-merging.
    terminal.writeLine('Reading commit message...');
    const commitBody: string = await execGitAsync(['log', '-1', '--format=%b', commitSha], terminal);

    terminal.writeLine(`Commit body:\n${commitBody}`);

    // Look for a "SourceBuild: <number>" trailer in the commit body.
    const match: RegExpMatchArray | null = commitBody.match(/^SourceBuild:\s*(\d+)\s*$/m);

    if (!match) {
      terminal.writeLine('No SourceBuild trailer found in commit message. Skipping publish.');
      terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]false');
      return;
    }

    const buildId: number = parseInt(match[1]!, 10);
    terminal.writeLine(`Bump pipeline run ID: ${buildId} (from SourceBuild trailer)`);

    terminal.writeLine('##vso[task.setvariable variable=IsVersionBumpMerge;isOutput=true]true');
    terminal.writeLine(`##vso[task.setvariable variable=BumpPipelineRunId;isOutput=true]${buildId}`);
  }
}
