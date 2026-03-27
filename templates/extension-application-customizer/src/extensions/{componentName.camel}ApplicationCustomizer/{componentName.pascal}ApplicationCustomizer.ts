import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer
} from '@microsoft/sp-application-base';
import { Dialog } from '@microsoft/sp-dialog';

import * as strings from '<%= componentName.pascal %>ApplicationCustomizerStrings';

const LOG_SOURCE: string = '<%= componentName.pascal %>ApplicationCustomizer';

/**
 * If your Application Customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface I<%= componentName.pascal %>ApplicationCustomizerProperties {
  // This is an example; replace with your own property
  testMessage: string;
}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class <%= componentName.pascal %>ApplicationCustomizer
  extends BaseApplicationCustomizer<I<%= componentName.pascal %>ApplicationCustomizerProperties> {

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    let message: string = this.properties.testMessage;
    if (!message) {
      message = '(No properties were provided.)';
    }

    Dialog.alert(`Hello from ${strings.Title}:\n\n${message}`).catch(() => {
      /* handle error */
    });

    return Promise.resolve();
  }
}
