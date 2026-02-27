import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { <%= componentNameCapitalCase %>PropertyPane } from './<%= componentNameCapitalCase %>PropertyPane';

export interface I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps {
  title: string;
}

export interface I<%= componentNameCapitalCase %>AdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = '<%= componentNameAllCaps %>_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = '<%= componentNameAllCaps %>_QUICK_VIEW';

export default class <%= componentNameCapitalCase %>AdaptiveCardExtension extends BaseAdaptiveCardExtension<
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionProps,
  I<%= componentNameCapitalCase %>AdaptiveCardExtensionState
> {
  private _deferredPropertyPane: <%= componentNameCapitalCase %>PropertyPane | undefined;

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
      /* webpackChunkName: '<%= componentNameHyphenCase %>-property-pane'*/
      './<%= componentNameCapitalCase %>PropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.<%= componentNameCapitalCase %>PropertyPane();
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
