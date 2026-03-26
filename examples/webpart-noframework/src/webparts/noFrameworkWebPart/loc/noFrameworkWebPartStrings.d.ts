declare interface INoFrameworkWebPartStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
  AppLocalEnvironmentSharePoint: string;
  AppLocalEnvironmentTeams: string;
  AppLocalEnvironmentOffice: string;
  AppLocalEnvironmentOutlook: string;
  AppSharePointEnvironment: string;
  AppTeamsTabEnvironment: string;
  AppOfficeEnvironment: string;
  AppOutlookEnvironment: string;
  UnknownEnvironment: string;
  GreetingMessage: string;
  PropertyValueLabel: string;
  WelcomeTitle: string;
  WelcomeDescription: string;
  LearnMoreHeading: string;
  LinkOverview: string;
  LinkMicrosoftGraph: string;
  LinkMicrosoftTeams: string;
  LinkVivaConnections: string;
  LinkMarketplace: string;
  LinkApiReference: string;
  LinkDeveloperCommunity: string;
}

declare module 'NoFrameworkWebPartStrings' {
  const strings: INoFrameworkWebPartStrings;
  export = strings;
}
