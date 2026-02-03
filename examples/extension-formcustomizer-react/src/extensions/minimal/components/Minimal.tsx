import * as React from 'react';
import { Log, FormDisplayMode } from '@microsoft/sp-core-library';
import { FormCustomizerContext } from '@microsoft/sp-listview-extensibility';

import styles from './Minimal.module.scss';

export interface IMinimalProps {
  context: FormCustomizerContext;
  displayMode: FormDisplayMode;
  onSave: () => void;
  onClose: () => void;
}

const LOG_SOURCE: string = 'Minimal';

export default class Minimal extends React.Component<IMinimalProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: Minimal mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: Minimal unmounted');
  }

  public render(): React.ReactElement<IMinimalProps> {
    return <div className={styles.minimal} />;
  }
}
