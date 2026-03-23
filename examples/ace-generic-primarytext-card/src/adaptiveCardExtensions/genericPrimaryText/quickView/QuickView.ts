import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from 'GenericPrimaryTextAdaptiveCardExtensionStrings';
import {
  IGenericPrimaryTextAdaptiveCardExtensionProps,
  IGenericPrimaryTextAdaptiveCardExtensionState
} from '../GenericPrimaryTextAdaptiveCardExtension';
import template from './template/QuickViewTemplate.json';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IGenericPrimaryTextAdaptiveCardExtensionProps,
  IGenericPrimaryTextAdaptiveCardExtensionState,
  IQuickViewData
> {
  public readonly template: ISPFxAdaptiveCard = template;

  public get data(): IQuickViewData {
    return {
      subTitle: strings.SubTitle,
      title: strings.Title
    };
  }
}
