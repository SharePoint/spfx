import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './React.module.scss';

export interface IReactProps {
  text: string;
}

const LOG_SOURCE: string = 'React';

export default class React extends React.Component<IReactProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: React mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: React unmounted');
  }

  public render(): React.ReactElement<IReactProps> {
    return (
      <div className={styles.react}>
        { this.props.text }
      </div>
    );
  }
}
