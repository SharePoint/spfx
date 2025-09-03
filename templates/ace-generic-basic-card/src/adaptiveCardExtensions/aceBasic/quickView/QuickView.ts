import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import strings from 'AceBasicAdaptiveCardExtensionStrings';
import {
  IAceBasicAdaptiveCardExtensionProps,
  IAceBasicAdaptiveCardExtensionState
} from '../AceBasicAdaptiveCardExtension';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IAceBasicAdaptiveCardExtensionProps,
  IAceBasicAdaptiveCardExtensionState,
  IQuickViewData
> {
  public get data(): IQuickViewData {
    return {
      subTitle: strings.SubTitle,
      title: strings.Title
    };
  }

  public get template(): ISPFxAdaptiveCard {
    return require('./template/QuickViewTemplate.json');
  }
}
