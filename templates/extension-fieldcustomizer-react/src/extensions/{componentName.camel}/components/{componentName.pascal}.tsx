import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './<%= componentName.pascal %>.module.scss';

export interface I<%= componentName.pascal %>Props {
  text: string;
}

const LOG_SOURCE: string = '<%= componentName.pascal %>';

export default class <%= componentName.pascal %> extends React.Component<I<%= componentName.pascal %>Props> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: <%= componentName.pascal %> mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: <%= componentName.pascal %> unmounted');
  }

  public render(): React.ReactElement<I<%= componentName.pascal %>Props> {
    return (
      <div className={styles.<%= componentName.camel %>}>
        { this.props.text }
      </div>
    );
  }
}
