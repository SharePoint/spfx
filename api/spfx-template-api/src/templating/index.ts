// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

export { type ICasedString, createCasedString } from './CasedString';
export { SPFxTemplate, type IRenderOptions } from './SPFxTemplate';
export { isBinaryFile } from './binaryFiles';
export {
  type ISPFxTemplateJson,
  SPFxTemplateDefinitionSchema,
  SPFxTemplateJsonFile,
  SPFX_TEMPLATE_CATEGORIES,
  type SPFxTemplateCategory
} from './SPFxTemplateJsonFile';
export {
  type ISPFxBuiltInContextInputs,
  type ISPFxBuiltInContext,
  type IBuildBuiltInContextOptions,
  BUILT_IN_PARAMETER_NAMES,
  buildBuiltInContext,
  toHyphenCase
} from './SPFxBuiltInContext';
export { ENGINE_VERSION } from '../engineVersion';
