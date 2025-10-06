import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import styles from './<%= componentClassName %>.module.scss';

export interface I<%= componentClassName %>Props {
}

export default class <%= componentClassName %> extends BaseClientSideWebPart<I<%= componentClassName %>Props> {
  public render(): void {
    this.domElement.innerHTML = `<div class="${ styles.<%= componentNameCamelCase %> }"></div>`;
  }

  protected onInit(): Promise<void> {
    return super.onInit();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
