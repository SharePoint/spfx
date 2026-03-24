// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxTemplate } from '../templating/SPFxTemplate';
import type { LocalFileSystemRepositorySource } from './LocalFileSystemRepositorySource';
import type { PublicGitHubRepositorySource } from './PublicGitHubRepositorySource';

/**
 * @public
 * The kind of SPFx template repository sources.
 */
export type SPFxTemplateRepositorySourceKind = 'local' | 'github';

/**
 * @public
 * Represents a SharePoint Framework (SPFx) template repository source.
 */
export type SPFxRepositorySource = LocalFileSystemRepositorySource | PublicGitHubRepositorySource;

/**
 * @public
 * Base class for SPFx template repository sources.
 */
export abstract class BaseSPFxTemplateRepositorySource {
  /**
   * The kind of the repository source
   */
  public readonly kind: SPFxTemplateRepositorySourceKind;

  public constructor(kind: SPFxTemplateRepositorySourceKind) {
    this.kind = kind;
  }

  /**
   * Retrieves all templates from this repository source.
   * @returns A Promise that resolves to an array of SPFxTemplate instances
   */
  public abstract getTemplatesAsync(): Promise<Array<SPFxTemplate>>;
}
