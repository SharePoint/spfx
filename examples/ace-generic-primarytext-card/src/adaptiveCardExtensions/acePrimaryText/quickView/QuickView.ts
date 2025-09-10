import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import strings from 'AcePrimaryTextAdaptiveCardExtensionStrings';
import {
  IAcePrimaryTextAdaptiveCardExtensionProps,
  IAcePrimaryTextAdaptiveCardExtensionState
} from '../AcePrimaryTextAdaptiveCardExtension';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IAcePrimaryTextAdaptiveCardExtensionProps,
  IAcePrimaryTextAdaptiveCardExtensionState,
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
