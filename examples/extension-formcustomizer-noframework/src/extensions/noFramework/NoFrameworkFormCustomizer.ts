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
    const container = this.domElement.appendChild(document.createElement('div'));
    container.className = styles.noFramework;

    this._saveButton = container.appendChild(document.createElement('button'));
    this._saveButton.textContent = 'Save';
    this._saveButton.addEventListener('click', this._onSave);

    this._closeButton = container.appendChild(document.createElement('button'));
    this._closeButton.textContent = 'Close';
    this._closeButton.addEventListener('click', this._onClose);
  }

  public onDispose(): void {
    // This method should be used to free any resources that were allocated during rendering.
    this._saveButton?.removeEventListener('click', this._onSave);
    this._closeButton?.removeEventListener('click', this._onClose);
    super.onDispose();
  }

  private _saveButton: HTMLButtonElement | undefined;
  private _closeButton: HTMLButtonElement | undefined;

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
