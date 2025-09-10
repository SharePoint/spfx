import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import styles from './MinimalWebPartWebPart.module.scss';

export interface IMinimalWebPartWebPartProps {
}

export default class MinimalWebPartWebPart extends BaseClientSideWebPart<IMinimalWebPartWebPartProps> {
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
