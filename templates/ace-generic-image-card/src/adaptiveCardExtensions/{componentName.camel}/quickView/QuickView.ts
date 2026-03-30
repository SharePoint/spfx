import { ISPFxAdaptiveCard, BaseAdaptiveCardQuickView } from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from '<%= componentName.pascal %>AdaptiveCardExtensionStrings';
import {
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState
} from '../<%= componentName.pascal %>AdaptiveCardExtension';

export interface IQuickViewData {
  subTitle: string;
  title: string;
}

export class QuickView extends BaseAdaptiveCardQuickView<
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState,
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
