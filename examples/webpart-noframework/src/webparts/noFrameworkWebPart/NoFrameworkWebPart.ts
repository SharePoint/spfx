import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';
import { escape } from '@microsoft/sp-lodash-subset';

import styles from './NoFrameworkWebPart.module.scss';
import * as strings from 'NoFrameworkWebPartStrings';
import welcomeDark from './assets/welcome-dark.png';
import welcomeLight from './assets/welcome-light.png';

export interface INoFrameworkWebPartProps {
  description: string;
}

export default class NoFrameworkWebPart extends BaseClientSideWebPart<INoFrameworkWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  public render(): void {
    this.domElement.innerHTML = `
    <section class="${styles.noFrameworkWebPart} ${!!this.context.sdks.microsoftTeams ? styles.teams : ''}">
      <div class="${styles.welcome}">
        <img alt="" src="${this._isDarkTheme ? welcomeDark : welcomeLight}" class="${styles.welcomeImage}" />
        <h2>${strings.GreetingMessage.replace(/\{0\}/g, escape(this.context.pageContext.user.displayName))}</h2>
        <div>${this._environmentMessage}</div>
        <div>${strings.PropertyValueLabel} <strong>${escape(this.properties.description)}</strong></div>
      </div>
      <div>
        <h3>${strings.WelcomeTitle}</h3>
        <p>
        ${strings.WelcomeDescription}
        </p>
        <h4>${strings.LearnMoreHeading}</h4>
          <ul class="${styles.links}">
            <li><a href="https://aka.ms/spfx" target="_blank" rel="noopener noreferrer">${strings.LinkOverview}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-graph" target="_blank" rel="noopener noreferrer">${strings.LinkMicrosoftGraph}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-teams" target="_blank" rel="noopener noreferrer">${strings.LinkMicrosoftTeams}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-viva" target="_blank" rel="noopener noreferrer">${strings.LinkVivaConnections}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-store" target="_blank" rel="noopener noreferrer">${strings.LinkMarketplace}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-api" target="_blank" rel="noopener noreferrer">${strings.LinkApiReference}</a></li>
            <li><a href="https://aka.ms/m365pnp" target="_blank" rel="noopener noreferrer">${strings.LinkDeveloperCommunity}</a></li>
          </ul>
      </div>
    </section>`;
  }

  protected async onInit(): Promise<void> {
    this._environmentMessage = await this._getEnvironmentMessage();
  }

  private async _getEnvironmentMessage(): Promise<string> {
    if (this.context.sdks.microsoftTeams) { // running in Teams, office.com or Outlook
      const context = await this.context.sdks.microsoftTeams.teamsJs.app.getContext();
      let environmentMessage: string;
      switch (context.app.host.name) {
        case 'Office': // running in Office
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
          break;
        case 'Outlook': // running in Outlook
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
          break;
        case 'Teams': // running in Teams
        case 'TeamsModern':
          environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
          break;
        default:
          environmentMessage = strings.UnknownEnvironment;
      }
      return environmentMessage;
    }

    return this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment;
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
