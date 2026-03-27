import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import styles from './MinimalWebPart.module.scss';

export interface IMinimalWebPartProps {
}

export default class MinimalWebPart extends BaseClientSideWebPart<IMinimalWebPartProps> {
  public render(): void {
    this.domElement.innerHTML = `<div class="${ styles.minimalWebPart }"></div>`;
  }

  protected onInit(): Promise<void> {
    return super.onInit();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
