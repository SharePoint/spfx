import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { AcePrimaryTextPropertyPane } from './AcePrimaryTextPropertyPane';

export interface IAcePrimaryTextAdaptiveCardExtensionProps {
  title: string;
}

export interface IAcePrimaryTextAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'AcePrimaryText_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'AcePrimaryText_QUICK_VIEW';

export default class AcePrimaryTextAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IAcePrimaryTextAdaptiveCardExtensionProps,
  IAcePrimaryTextAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: AcePrimaryTextPropertyPane | undefined;

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
      /* webpackChunkName: 'AcePrimaryText-property-pane'*/
      './AcePrimaryTextPropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.AcePrimaryTextPropertyPane();
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
