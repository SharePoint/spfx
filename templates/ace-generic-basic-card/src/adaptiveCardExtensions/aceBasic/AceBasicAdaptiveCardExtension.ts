import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { AceBasicPropertyPane } from './AceBasicPropertyPane';

export interface IAceBasicAdaptiveCardExtensionProps {
  title: string;
}

export interface IAceBasicAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'AceBasic_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'AceBasic_QUICK_VIEW';

export default class AceBasicAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IAceBasicAdaptiveCardExtensionProps,
  IAceBasicAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: AceBasicPropertyPane | undefined;

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
      /* webpackChunkName: 'AceBasic-property-pane'*/
      './AceBasicPropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.AceBasicPropertyPane();
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
