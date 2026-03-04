import { Log } from '@microsoft/sp-core-library';
import {
  BaseFormCustomizer
} from '@microsoft/sp-listview-extensibility';

import styles from './NoFrameworkFormCustomizer.module.scss';

/**
 * If your form customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface INoFrameworkFormCustomizerProperties {
  // This is an example; replace with your own property
  sampleText?: string;
}

const LOG_SOURCE: string = 'NoFrameworkFormCustomizer';
export default class NoFrameworkFormCustomizer
  extends BaseFormCustomizer<INoFrameworkFormCustomizerProperties> {

  public onInit(): Promise<void> {
    // Add your custom initialization to this method. The framework will wait
    // for the returned promise to resolve before rendering the form.
    Log.info(LOG_SOURCE, 'Activated NoFrameworkFormCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    return Promise.resolve();
  }

  public render(): void {
    // Use this method to perform your custom rendering.
    this.domElement.innerHTML = `<div class="${ styles.noFramework }">
      <button id="save">Save</button>
      <button id="close">Close</button>
    </div>`;
    this.domElement.querySelector('#save')!.addEventListener('click', this._onSave);
    this.domElement.querySelector('#close')!.addEventListener('click', this._onClose);
  }

  public onDispose(): void {
    // This method should be used to free any resources that were allocated during rendering.
    this.domElement.querySelector('#save')?.removeEventListener('click', this._onSave);
    this.domElement.querySelector('#close')?.removeEventListener('click', this._onClose);
    super.onDispose();
  }

  private _onSave = (): void => {
    // You MUST call this.formSaved() after you save the form.
    this.formSaved();
  }

  private _onClose = (): void => {
    // You MUST call this.formClosed() after you close the form.
    this.formClosed();
  }
}
