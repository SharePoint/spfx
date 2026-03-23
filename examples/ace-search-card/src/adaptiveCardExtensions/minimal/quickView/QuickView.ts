import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from 'MinimalAdaptiveCardExtensionStrings';
import {
  IMinimalAdaptiveCardExtensionProps,
  IMinimalAdaptiveCardExtensionState
} from '../MinimalAdaptiveCardExtension';
import template from './template/QuickViewTemplate.json';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IMinimalAdaptiveCardExtensionProps,
  IMinimalAdaptiveCardExtensionState,
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
