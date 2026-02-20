import { Log } from '@microsoft/sp-core-library';
import * as React from 'react';

import styles from './ReactFieldCustomizer.module.scss';

export interface IReactFieldCustomizerProps {
  text: string;
}

const LOG_SOURCE: string = 'ReactFieldCustomizer';

export default class ReactFieldCustomizer extends React.Component<IReactFieldCustomizerProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: ReactFieldCustomizer mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: ReactFieldCustomizer unmounted');
  }

  public render(): React.ReactElement<IReactFieldCustomizerProps> {
    return (
      <div className={styles.reactFieldCustomizer}>
        { this.props.text }
      </div>
    );
  }
}
