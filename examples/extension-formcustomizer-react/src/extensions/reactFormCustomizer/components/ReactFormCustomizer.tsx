import * as React from 'react';
import { Log, FormDisplayMode } from '@microsoft/sp-core-library';
import { FormCustomizerContext } from '@microsoft/sp-listview-extensibility';

import styles from './ReactFormCustomizer.module.scss';

export interface IReactFormCustomizerProps {
  context: FormCustomizerContext;
  displayMode: FormDisplayMode;
  onSave: () => void;
  onClose: () => void;
}

const LOG_SOURCE: string = 'ReactFormCustomizer';

export default class ReactFormCustomizer extends React.Component<IReactFormCustomizerProps> {
  public componentDidMount(): void {
    Log.info(LOG_SOURCE, 'React Element: ReactFormCustomizer mounted');
  }

  public componentWillUnmount(): void {
    Log.info(LOG_SOURCE, 'React Element: ReactFormCustomizer unmounted');
  }

  public render(): React.ReactElement<IReactFormCustomizerProps> {
    return <div className={styles.reactFormCustomizer} />;
  }
}
