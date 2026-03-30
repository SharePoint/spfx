import * as React from 'react';
import { Log, FormDisplayMode } from '@microsoft/sp-core-library';
import { FormCustomizerContext } from '@microsoft/sp-listview-extensibility';

import styles from './<%= componentName.pascal %>.module.scss';

export interface I<%= componentName.pascal %>Props {
  context: FormCustomizerContext;
  displayMode: FormDisplayMode;
  onSave: () => void;
  onClose: () => void;
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
    return <div className={styles.<%= componentName.camel %>} />;
  }
}
