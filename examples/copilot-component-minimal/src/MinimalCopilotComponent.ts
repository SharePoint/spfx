import { BaseCopilotComponent } from '@microsoft/sp-copilot-component';

import type { IMinimalCopilotComponentProperties } from './MinimalProperties';

export default class MinimalCopilotComponent extends BaseCopilotComponent<IMinimalCopilotComponentProperties> {
  protected render(): void {
    this.context.domElement.textContent = `Hello, ${this.properties.name}!`;
  }
}
