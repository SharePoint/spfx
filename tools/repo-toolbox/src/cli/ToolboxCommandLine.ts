// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from '@rushstack/ts-command-line';
import type { ITerminal } from '@rushstack/terminal';

import { CreateOrUpdatePrAction } from './actions/CreateOrUpdatePrAction';
import { EmitGitHubVarsAndTagBuildAction } from './actions/EmitGitHubVarsAndTagBuildAction';
import { FindBumpPipelineRunAction } from './actions/FindBumpPipelineRunAction';
import { CreateGitHubReleasesAction } from './actions/CreateGitHubReleasesAction';
import { VerifyNpmTagAction } from './actions/VerifyNpmTagAction';

export class ToolboxCommandLine extends CommandLineParser {
  public readonly terminal: ITerminal;

  public constructor(terminal: ITerminal) {
    super({
      toolFilename: 'repo-toolbox',
      toolDescription: 'Used to execute various operations specific to this repo'
    });

    this.terminal = terminal;

    this.addAction(new CreateOrUpdatePrAction(terminal));
    this.addAction(new EmitGitHubVarsAndTagBuildAction(terminal));
    this.addAction(new FindBumpPipelineRunAction(terminal));
    this.addAction(new CreateGitHubReleasesAction(terminal));
    this.addAction(new VerifyNpmTagAction(terminal));
  }
}
