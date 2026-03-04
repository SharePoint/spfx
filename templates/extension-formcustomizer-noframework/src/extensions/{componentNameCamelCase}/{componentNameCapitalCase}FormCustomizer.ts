import { Log } from '@microsoft/sp-core-library';
import {
  BaseFormCustomizer
} from '@microsoft/sp-listview-extensibility';

import styles from './<%= componentNameCapitalCase %>FormCustomizer.module.scss';

/**
 * If your form customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface I<%= componentNameCapitalCase %>FormCustomizerProperties {
  // This is an example; replace with your own property
  sampleText?: string;
}

const LOG_SOURCE: string = '<%= componentNameCapitalCase %>FormCustomizer';
export default class <%= componentNameCapitalCase %>FormCustomizer
  extends BaseFormCustomizer<I<%= componentNameCapitalCase %>FormCustomizerProperties> {

  public onInit(): Promise<void> {
    // Add your custom initialization to this method. The framework will wait
    // for the returned promise to resolve before rendering the form.
    Log.info(LOG_SOURCE, 'Activated <%= componentNameCapitalCase %>FormCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    return Promise.resolve();
  }

  public render(): void {
    // Use this method to perform your custom rendering.
    // Call this._onSave() / this._onClose() from your form UI when the user saves or cancels.
    this.domElement.innerHTML = `<div class="${ styles.<%= componentNameCamelCase %> }"></div>`;
  }

  public onDispose(): void {
    // This method should be used to free any resources that were allocated during rendering.
    super.onDispose();
  }

  /**
   * Use the methods below to handle the save and close events.
   * Please note that formSaved() MUST be called when a form is saved, and formClosed() when it is closed.
   */
  private _onSave = (): void => {
    // TODO: Add your custom save logic here.

    // You MUST call this.formSaved() after you save the form.
    this.formSaved();
  }

  private _onClose = (): void => {
    // TODO: Add your custom close logic here.

    // You MUST call this.formClosed() after you close the form.
    this.formClosed();
  }
}
