import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from '<%= componentNameCapitalCase %>AdaptiveCardExtensionStrings';
import {
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps,
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionState
} from '../<%= componentNameCapitalCase %>AdaptiveCardExtension';
import template from './template/QuickViewTemplate.json';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps,
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionState,
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
