import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';

import * as strings from '<%= componentNameCapitalCase %>FieldCustomizerStrings';
import <%= componentNameCapitalCase %>, { I<%= componentNameCapitalCase %>Props } from './components/<%= componentNameCapitalCase %>';

/**
 * If your field customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface I<%= componentNameCapitalCase %>FieldCustomizerProperties {
  // This is an example; replace with your own property
  sampleText?: string;
}

const LOG_SOURCE: string = '<%= componentNameCapitalCase %>FieldCustomizer';

export default class <%= componentNameCapitalCase %>FieldCustomizer
  extends BaseFieldCustomizer<I<%= componentNameCapitalCase %>FieldCustomizerProperties> {

  public onInit(): Promise<void> {
    // Add your custom initialization to this method.  The framework will wait
    // for the returned promise to resolve before firing any BaseFieldCustomizer events.
    Log.info(LOG_SOURCE, 'Activated <%= componentNameCapitalCase %>FieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "<%= componentNameCapitalCase %>FieldCustomizer" and "${strings.Title}"`);
    return Promise.resolve();
  }

  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    // Use this method to perform your custom cell rendering.
    const text: string = `${this.properties.sampleText}: ${event.fieldValue}`;

    const <%= componentNameCamelCase %>: React.ReactElement<I<%= componentNameCapitalCase %>Props> =
      React.createElement(<%= componentNameCapitalCase %>, { text } as I<%= componentNameCapitalCase %>Props);

    ReactDOM.render(<%= componentNameCamelCase %>, event.domElement);
  }

  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    // This method should be used to free any resources that were allocated during rendering.
    // For example, if your onRenderCell() called ReactDOM.render(), then you should
    // call ReactDOM.unmountComponentAtNode() here.
    ReactDOM.unmountComponentAtNode(event.domElement);
    super.onDisposeCell(event);
  }
}
