import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from 'GenericCardAdaptiveCardExtensionStrings';
import {
  IGenericCardAdaptiveCardExtensionProps,
  IGenericCardAdaptiveCardExtensionState
} from '../GenericCardAdaptiveCardExtension';
import QuickViewTemplate from './template/QuickViewTemplate.json';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IGenericCardAdaptiveCardExtensionProps,
  IGenericCardAdaptiveCardExtensionState,
  IQuickViewData
> {
  public get data(): IQuickViewData {
    return {
      subTitle: strings.SubTitle,
      title: strings.Title
    };
  }

  public get template(): ISPFxAdaptiveCard {
    return QuickViewTemplate as unknown as ISPFxAdaptiveCard;
  }
}
