import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { GenericImagePropertyPane } from './GenericImagePropertyPane';

export interface IGenericImageAdaptiveCardExtensionProps {
  title: string;
}

export interface IGenericImageAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'GENERIC_IMAGE_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'GENERIC_IMAGE_QUICK_VIEW';

export default class GenericImageAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IGenericImageAdaptiveCardExtensionProps,
  IGenericImageAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: GenericImagePropertyPane | undefined;

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
      /* webpackChunkName: 'generic-image-property-pane'*/
      './GenericImagePropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.GenericImagePropertyPane();
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
