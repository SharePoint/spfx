// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Library for generating SharePoint Framework (SPFx) solutions from templates.
 *
 * @packageDocumentation
 */

export {
  SPFxTemplate,
  isBinaryFile as _isBinaryFile,
  type ISPFxTemplateJson,
  SPFxTemplateDefinitionSchema,
  SPFxTemplateJsonFile,
  type IRenderOptions,
  SPFX_TEMPLATE_CATEGORIES,
  type SPFxTemplateCategory
} from './templating/index';
export {
  SPFxTemplateRepositoryManager,
  type SPFxTemplateRepositorySourceKind,
  BaseSPFxTemplateRepositorySource,
  type SPFxRepositorySource,
  SPFxTemplateCollection,
  LocalFileSystemRepositorySource,
  PublicGitHubRepositorySource,
  type IPublicGitHubRepositorySourceOptions
} from './repositories/index';
export {
  IMergeHelper,
  JsonMergeHelper,
  PackageJsonMergeHelper,
  ConfigJsonMergeHelper,
  PackageSolutionJsonMergeHelper,
  ServeJsonMergeHelper,
  SPFxTemplateWriter
} from './writing/index';
