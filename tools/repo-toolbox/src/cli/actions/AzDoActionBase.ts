// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { ITerminal } from '@rushstack/terminal';
import {
  type ICommandLineActionOptions,
  type IRequiredCommandLineStringParameter,
  CommandLineAction
} from '@rushstack/ts-command-line';

import { AzDoClient } from '../../utilities/AzDoClient';

/**
 * Base class for actions that interact with Azure DevOps. Defines the shared
 * `--org-url`, `--project`, and `--access-token` parameters and provides a
 * helper to create an {@link AzDoClient}.
 */
export abstract class AzDoActionBase extends CommandLineAction {
  protected readonly _terminal: ITerminal;

  private readonly _orgUrlParameter: IRequiredCommandLineStringParameter;
  private readonly _projectParameter: IRequiredCommandLineStringParameter;
  private readonly _accessTokenParameter: IRequiredCommandLineStringParameter;

  public constructor(terminal: ITerminal, options: ICommandLineActionOptions) {
    super(options);

    this._terminal = terminal;

    this._orgUrlParameter = this.defineStringParameter({
      parameterLongName: '--org-url',
      argumentName: 'URL',
      description: 'Azure DevOps organization URL',
      required: true,
      environmentVariable: 'SYSTEM_COLLECTIONURI'
    });

    this._projectParameter = this.defineStringParameter({
      parameterLongName: '--project',
      argumentName: 'PROJECT',
      description: 'Azure DevOps project name',
      required: true,
      environmentVariable: 'SYSTEM_TEAMPROJECT'
    });

    this._accessTokenParameter = this.defineStringParameter({
      parameterLongName: '--access-token',
      argumentName: 'TOKEN',
      description: 'Azure DevOps access token',
      required: true,
      environmentVariable: 'SYSTEM_ACCESSTOKEN'
    });
  }

  protected _createAzDoClient(): AzDoClient {
    const orgUrl: string = this._orgUrlParameter.value;
    const project: string = this._projectParameter.value;
    const accessToken: string = this._accessTokenParameter.value;

    this._terminal.writeLine(`AzDO organization: ${orgUrl}`);
    this._terminal.writeLine(`AzDO project: ${project}`);

    return new AzDoClient({ orgUrl, project, accessToken }, this._terminal);
  }
}
