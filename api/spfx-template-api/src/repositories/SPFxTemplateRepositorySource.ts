// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxTemplate } from '../templating/SPFxTemplate';
import type { LocalFileSystemRepositorySource } from './LocalFileSystemRepositorySource';
import type { PublicGitHubRepositorySource } from './PublicGitHubRepositorySource';

/**
 * @public
 * The type of SPFx template repository sources.
 */
export type SPFxTemplateRepositorySourceTypes = 'local' | 'github';

/**
 * @public
 * Base class for SPFx template repository sources.
 */
export abstract class BaseSPFxTemplateRepositorySource {
  private readonly _type: SPFxTemplateRepositorySourceTypes;

  public constructor(type: SPFxTemplateRepositorySourceTypes) {
    this._type = type;
  }

  /** The type of the repository source */
  public get type(): SPFxTemplateRepositorySourceTypes {
    return this._type;
  }

  /**
   * Retrieves all templates from this repository source.
   * @returns A Promise that resolves to an array of SPFxTemplate instances
   */
  public abstract getTemplatesAsync(): Promise<Array<SPFxTemplate>>;
}

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template repository source.
 */
export type SPFxRepositorySource = LocalFileSystemRepositorySource | PublicGitHubRepositorySource;
