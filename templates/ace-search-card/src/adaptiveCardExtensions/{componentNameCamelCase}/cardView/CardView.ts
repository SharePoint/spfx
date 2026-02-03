import {
  BaseComponentsCardView,
  ComponentsCardViewParameters,
  SearchCardView,
  IExternalLinkCardAction,
  IQuickViewCardAction
} from '@microsoft/sp-adaptive-card-extension-base';
import * as strings from '<%= componentNameCapitalCase %>AdaptiveCardExtensionStrings';
import {
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps,
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionState,
  QUICK_VIEW_REGISTRY_ID
} from '../<%= componentNameCapitalCase %>AdaptiveCardExtension';

export class CardView extends BaseComponentsCardView<
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps,
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionState,
  ComponentsCardViewParameters
> {
  public get cardViewParameters(): ComponentsCardViewParameters {
    return SearchCardView({
      cardBar: {
        componentName: 'cardBar',
        title: this.properties.title
      },
      header: {
        componentName: 'text',
        text: strings.PrimaryText
      },
      body: {
        componentName: 'searchBox',
        placeholder: 'Search...',
        id: 'searchBox',
        button: {
          action: {
            type: 'QuickView',
            parameters: {
              view: QUICK_VIEW_REGISTRY_ID
            }
          }
        }
      },
      footer: {
        componentName: 'searchFooter',
        title: strings.QuickViewButton,
        text: strings.QuickViewButton
      }
    });
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
