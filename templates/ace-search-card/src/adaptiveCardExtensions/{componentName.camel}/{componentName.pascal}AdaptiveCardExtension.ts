import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { <%= componentName.pascal %>PropertyPane } from './<%= componentName.pascal %>PropertyPane';

export interface I<%= componentName.pascal %>AdaptiveCardExtensionProps {
  title: string;
}

export interface I<%= componentName.pascal %>AdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = '<%= componentName.allCaps %>_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = '<%= componentName.allCaps %>_QUICK_VIEW';

export default class <%= componentName.pascal %>AdaptiveCardExtension extends BaseAdaptiveCardExtension<
  I<%= componentName.pascal %>AdaptiveCardExtensionProps,
  I<%= componentName.pascal %>AdaptiveCardExtensionState
> {
  private _deferredPropertyPane: <%= componentName.pascal %>PropertyPane | undefined;

  public onInit(): Promise<void> {
    this.state = { };

    // registers the card view to be shown in a dashboard
    this.cardNavigator.register(CARD_VIEW_REGISTRY_ID, () => new CardView());
    // registers the quick view to open via QuickView action
    this.quickViewNavigator.register(QUICK_VIEW_REGISTRY_ID, () => new QuickView());

    return Promise.resolve();
  }

  protected loadPropertyPaneResources(): Promise<void> {
    return import(
      /* webpackChunkName: '<%= componentName.hyphen %>-property-pane'*/
      './<%= componentName.pascal %>PropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.<%= componentName.pascal %>PropertyPane();
        }
      );
  }

  protected renderCard(): string | undefined {
    return CARD_VIEW_REGISTRY_ID;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return this._deferredPropertyPane?.getPropertyPaneConfiguration() ?? super.getPropertyPaneConfiguration();
  }
}
