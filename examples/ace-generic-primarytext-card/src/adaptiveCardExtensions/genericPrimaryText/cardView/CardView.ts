import {
  BasePrimaryTextCardView,
  IPrimaryTextCardParameters,
  IExternalLinkCardAction,
  IQuickViewCardAction,
  ICardButton
} from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from 'GenericPrimaryTextAdaptiveCardExtensionStrings';
import {
  IGenericPrimaryTextAdaptiveCardExtensionProps,
  IGenericPrimaryTextAdaptiveCardExtensionState,
  QUICK_VIEW_REGISTRY_ID
} from '../GenericPrimaryTextAdaptiveCardExtension';

export class CardView extends BasePrimaryTextCardView<
  IGenericPrimaryTextAdaptiveCardExtensionProps,
  IGenericPrimaryTextAdaptiveCardExtensionState
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
