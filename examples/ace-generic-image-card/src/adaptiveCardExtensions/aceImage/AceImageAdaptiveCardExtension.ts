import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { AceImagePropertyPane } from './AceImagePropertyPane';

export interface IAceImageAdaptiveCardExtensionProps {
  title: string;
}

export interface IAceImageAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'ACE_IMAGE_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'ACE_IMAGE_QUICK_VIEW';

export default class AceImageAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IAceImageAdaptiveCardExtensionProps,
  IAceImageAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: AceImagePropertyPane | undefined;

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
      /* webpackChunkName: 'ace-image-property-pane'*/
      './AceImagePropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.AceImagePropertyPane();
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
