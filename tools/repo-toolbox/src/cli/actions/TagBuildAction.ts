// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import { CommandLineAction } from '@rushstack/ts-command-line';

import { BUMP_BUILD_TAG_PREFIX } from '../../utilities/BumpVersionsConstants';
import { execGitAsync } from '../../utilities/GitUtilities';

/**
 * Tags the current AzDO build with the HEAD commit SHA so it can later be
 * located by {@link FindBumpPipelineRunAction}, and emits the SHA as an output
 * variable. Should only be called from the version-bump pipeline.
 *
 * Outputs:
 *   - BumpSha  — HEAD commit SHA of the bump branch
 */
export class TagBuildAction extends CommandLineAction {
  private readonly _terminal: ITerminal;

  public constructor(terminal: ITerminal) {
    super({
      actionName: 'tag-build',
      summary: 'Tags the AzDO build with the bump commit SHA and emits it as an output variable.',
      documentation:
        'Reads the HEAD commit SHA, emits it as the BumpSha AzDO output variable, and tags the ' +
        'current build with a structured tag so that find-bump-pipeline-run can locate this run later.'
    });

    this._terminal = terminal;
  }

  protected override async onExecuteAsync(): Promise<void> {
    const terminal: ITerminal = this._terminal;

    const bumpSha: string = await execGitAsync(['rev-parse', 'HEAD'], terminal);
    terminal.writeLine(`##vso[task.setvariable variable=BumpSha;isOutput=true]${bumpSha}`);
    terminal.writeLine(`Emitted BumpSha: ${bumpSha}`);

    const bumpTag: string = `${BUMP_BUILD_TAG_PREFIX}${bumpSha}`;
    terminal.writeLine(`##vso[build.addbuildtag]${bumpTag}`);
    terminal.writeLine(`Tagged build: ${bumpTag}`);
  }
}
