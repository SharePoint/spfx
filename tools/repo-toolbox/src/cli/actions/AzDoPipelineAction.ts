// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  CommandLineAction,
  type ICommandLineActionOptions,
  type IRequiredCommandLineStringParameter
} from '@rushstack/ts-command-line';

/**
 * Base class for repo-toolbox actions that run in an Azure DevOps pipeline context.
 * Defines common AzDO parameters shared across actions.
 */
export abstract class AzDoPipelineAction extends CommandLineAction {
  protected readonly _terminal: ITerminal;

  protected readonly _collectionUriParameter: IRequiredCommandLineStringParameter;
  protected readonly _teamProjectParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal, options: ICommandLineActionOptions) {
    super(options);

    this._terminal = terminal;

    this._collectionUriParameter = this.defineStringParameter({
      parameterLongName: '--collection-uri',
      argumentName: 'URI',
      description: 'Azure DevOps collection URI.',
      required: true,
      environmentVariable: 'SYSTEM_COLLECTIONURI'
    });

    this._teamProjectParameter = this.defineStringParameter({
      parameterLongName: '--team-project',
      argumentName: 'PROJECT',
      description: 'Azure DevOps team project name.',
      required: true,
      environmentVariable: 'SYSTEM_TEAMPROJECT'
    });
  }
}
