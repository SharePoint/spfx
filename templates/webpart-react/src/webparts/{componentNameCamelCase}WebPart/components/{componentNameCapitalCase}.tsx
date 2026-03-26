import * as React from 'react';
import styles from './<%= componentNameCapitalCase %>.module.scss';
import type { I<%= componentNameCapitalCase %>Props } from './I<%= componentNameCapitalCase %>Props';
import { escape } from '@microsoft/sp-lodash-subset';
import * as strings from '<%= componentNameCapitalCase %>WebPartStrings';

export default class <%= componentNameCapitalCase %> extends React.Component<I<%= componentNameCapitalCase %>Props> {
  public render(): React.ReactElement<I<%= componentNameCapitalCase %>Props> {
    const {
      description,
      isDarkTheme,
      environmentMessage,
      hasTeamsContext,
      userDisplayName
    } = this.props;

    return (
      <section className={`${styles.<%= componentNameCamelCase %>} ${hasTeamsContext ? styles.teams : ''}`}>
        <div className={styles.welcome}>
          <img alt="" src={isDarkTheme ? require('../assets/welcome-dark.png') : require('../assets/welcome-light.png')} className={styles.welcomeImage} />
          <h2>{strings.GreetingMessage.replace(/\{0\}/g, escape(userDisplayName))}</h2>
          <div>{environmentMessage}</div>
          <div>{strings.PropertyValueLabel}{' '}<strong>{escape(description)}</strong></div>
        </div>
        <div>
          <h3>{strings.WelcomeTitle}</h3>
          <p>
            {strings.WelcomeDescription}
          </p>
          <h4>{strings.LearnMoreHeading}</h4>
          <ul className={styles.links}>
            <li><a href="https://aka.ms/spfx" target="_blank" rel="noreferrer">{strings.LinkOverview}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-graph" target="_blank" rel="noreferrer">{strings.LinkMicrosoftGraph}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-teams" target="_blank" rel="noreferrer">{strings.LinkMicrosoftTeams}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-viva" target="_blank" rel="noreferrer">{strings.LinkVivaConnections}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-store" target="_blank" rel="noreferrer">{strings.LinkMarketplace}</a></li>
            <li><a href="https://aka.ms/spfx-yeoman-api" target="_blank" rel="noreferrer">{strings.LinkApiReference}</a></li>
            <li><a href="https://aka.ms/m365pnp" target="_blank" rel="noreferrer">{strings.LinkDeveloperCommunity}</a></li>
          </ul>
        </div>
      </section>
    );
  }
}
