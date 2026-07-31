import { BaseCopilotComponent } from '@microsoft/sp-copilot-component';

import type { I<%= componentName.pascal %>CopilotComponentProperties } from './<%= componentName.pascal %>Properties';

export default class <%= componentName.pascal %>CopilotComponent extends BaseCopilotComponent<I<%= componentName.pascal %>CopilotComponentProperties> {
  protected override render(): void {
    this.context.domElement.textContent = this.properties.message;
  }
}
