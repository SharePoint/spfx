// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Library for generating SharePoint Framework (SPFx) solutions from templates.
 *
 * @packageDocumentation
 */

export {
  SPFxTemplate,
  type ISPFxTemplateJson,
  SPFxTemplateDefinitionSchema,
  SPFxTemplateJsonFile
} from './templating/index';
export {
  SPFxTemplateRepositoryManager,
  type SPFxTemplateRepositorySourceTypes,
  BaseSPFxTemplateRepositorySource,
  type SPFxRepositorySource,
  SPFxTemplateCollection,
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource
} from './repositories/index';
