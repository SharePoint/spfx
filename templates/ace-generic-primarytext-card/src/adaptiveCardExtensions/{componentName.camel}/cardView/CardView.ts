import {
  BasePrimaryTextCardView,
  IPrimaryTextCardParameters,
  IExternalLinkCardAction,
  IQuickViewCardAction,
  ICardButton
} from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from '<%= componentName.pascal %>AdaptiveCardExtensionStrings';
import {
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState,
  QUICK_VIEW_REGISTRY_ID
} from '../<%= componentName.pascal %>AdaptiveCardExtension';

export class CardView extends BasePrimaryTextCardView<
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState
> {
  public get cardButtons(): [ICardButton] | [ICardButton, ICardButton] | undefined {
    return [
      {
        title: strings.QuickViewButton,
        action: {
          type: 'QuickView',
          parameters: {
            view: QUICK_VIEW_REGISTRY_ID
          }
        }
      }
    ];
  }

  public get data(): IPrimaryTextCardParameters {
    return {
      primaryText: strings.PrimaryText,
      description: strings.Description,
      title: this.properties.title
    };
  }

  public get onCardSelection(): IQuickViewCardAction | IExternalLinkCardAction | undefined {
    return {
      type: 'ExternalLink',
      parameters: {
        target: 'https://www.bing.com'
      }
    };
  }
}
