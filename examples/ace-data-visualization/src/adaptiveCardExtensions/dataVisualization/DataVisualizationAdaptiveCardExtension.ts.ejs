import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseAdaptiveCardExtension } from '@microsoft/sp-adaptive-card-extension-base';
import { CardView } from './cardView/CardView';
import { QuickView } from './quickView/QuickView';
import { DataVisualizationPropertyPane } from './DataVisualizationPropertyPane';

export interface IDataVisualizationAdaptiveCardExtensionProps {
  title: string;
}

export interface IDataVisualizationAdaptiveCardExtensionState {
}

const CARD_VIEW_REGISTRY_ID: string = 'DataVisualization_CARD_VIEW';
export const QUICK_VIEW_REGISTRY_ID: string = 'DataVisualization_QUICK_VIEW';

export default class DataVisualizationAdaptiveCardExtension extends BaseAdaptiveCardExtension<
  IDataVisualizationAdaptiveCardExtensionProps,
  IDataVisualizationAdaptiveCardExtensionState
> {
  private _deferredPropertyPane: DataVisualizationPropertyPane | undefined;

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
      /* webpackChunkName: 'DataVisualization-property-pane'*/
      './DataVisualizationPropertyPane'
    )
      .then(
        (component) => {
          this._deferredPropertyPane = new component.DataVisualizationPropertyPane();
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
