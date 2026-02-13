import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { MinimalPropertyPane } from './MinimalPropertyPane';

export interface IMinimalAdaptiveCardExtensionProps {
  title: string;
}

export interface IMinimalAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'MINIMAL_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'MINIMAL_QUICK_VIEW';

export default class MinimalAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IMinimalAdaptiveCardExtensionProps,
  IMinimalAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: MinimalPropertyPane | undefined;

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
      /* webpackChunkName: 'minimal-property-pane'*/
      './MinimalPropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.MinimalPropertyPane();
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
