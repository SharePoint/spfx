declare interface I<%= componentNameCapitalCase %>AdaptiveCardExtensionStrings {
  PropertyPaneDescription: string;
  TitleFieldLabel: string;
  Title: string;
  SubTitle: string;
  PrimaryText: string;
  Description: string;
  QuickViewButton: string;
}

declare module '<%= componentNameCapitalCase %>AdaptiveCardExtensionStrings' {
  const strings: I<%= componentNameCapitalCase %>AdaptiveCardExtensionStrings;
  export = strings;
}
