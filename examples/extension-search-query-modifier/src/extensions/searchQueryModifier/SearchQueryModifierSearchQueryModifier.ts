import { Log } from '@microsoft/sp-core-library';
import { BaseSearchQueryModifier, IQuery, SearchQueryScenario } from '@microsoft/sp-search-extensibility';

import strings from 'SearchQueryModifierSearchQueryModifierStrings';

/**
 * If your search query modifier uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface ISearchQueryModifierSearchQueryModifierProperties {
  // This is an example; replace with your own property
  testMessage: string;
}

const LOG_SOURCE: string = 'SearchQueryModifierSearchQueryModifier';

export default class SearchQueryModifierSearchQueryModifier extends BaseSearchQueryModifier<ISearchQueryModifierSearchQueryModifierProperties> {

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, 'Initialized SearchQueryModifierSearchQueryModifier');
    return Promise.resolve();
  }

  public modifySearchQuery(query: IQuery, scenario: SearchQueryScenario): Promise<IQuery> {
    Log.info(LOG_SOURCE, `Modifying query ${query.queryText} with ${strings.Title}`);
    return Promise.resolve(query);
  }
}
