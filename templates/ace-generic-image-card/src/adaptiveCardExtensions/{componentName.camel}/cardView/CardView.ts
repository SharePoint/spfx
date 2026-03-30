import {
  BaseImageCardView,
  IImageCardParameters,
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

export class CardView extends BaseImageCardView<
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState
> {
  /**
   * Buttons will not be visible if card size is 'Medium' with Image Card View.
   * It will support up to two buttons for 'Large' card size.
   */
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

  public get data(): IImageCardParameters {
    return {
      primaryText: strings.PrimaryText,
      imageUrl: require('../assets/MicrosoftLogo.png'),
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
