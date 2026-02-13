import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './<%= componentNameCapitalCase %>.module.scss';

export interface I<%= componentNameCapitalCase %>Props {
  text: string;
}

const LOG_SOURCE: string = '<%= componentNameCapitalCase %>';

export default class <%= componentNameCapitalCase %> extends React.Component<I<%= componentNameCapitalCase %>Props> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: <%= componentNameCapitalCase %> mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: <%= componentNameCapitalCase %> unmounted');
  }

  public render(): React.ReactElement<I<%= componentNameCapitalCase %>Props> {
    return (
      <div className={styles.<%= componentNameCamelCase %>}>
        { this.props.text }
      </div>
    );
  }
}
