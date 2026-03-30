import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import styles from './<%= componentName.pascal %>WebPart.module.scss';

export interface I<%= componentName.pascal %>WebPartProps {
}

export default class <%= componentName.pascal %>WebPart extends BaseClientSideWebPart<I<%= componentName.pascal %>WebPartProps> {
  public render(): void {
    this.domElement.innerHTML = `<div class="${ styles.<%= componentName.camel %>WebPart }"></div>`;
  }

  protected onInit(): Promise<void> {
    return super.onInit();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
