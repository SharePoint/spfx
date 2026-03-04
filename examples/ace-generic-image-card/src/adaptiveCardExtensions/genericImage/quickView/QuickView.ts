import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from 'GenericImageAdaptiveCardExtensionStrings';
import {
  IGenericImageAdaptiveCardExtensionProps,
  IGenericImageAdaptiveCardExtensionState
} from '../GenericImageAdaptiveCardExtension';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  IGenericImageAdaptiveCardExtensionProps,
  IGenericImageAdaptiveCardExtensionState,
  IQuickViewData
> {
  public get data(): IQuickViewData {
    return {
      subTitle: strings.SubTitle,
      title: strings.Title
    };
  }

  public get template(): ISPFxAdaptiveCard {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./template/QuickViewTemplate.json');
  }
}
