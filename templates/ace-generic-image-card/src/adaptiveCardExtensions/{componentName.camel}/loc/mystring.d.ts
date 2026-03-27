declare interface I<%= componentName.pascal %>AdaptiveCardExtensionStrings {
  PropertyPaneDescription: string;
  TitleFieldLabel: string;
  Title: string;
  SubTitle: string;
  PrimaryText: string;
  Description: string;
  QuickViewButton: string;
}

declare module '<%= componentName.pascal %>AdaptiveCardExtensionStrings' {
  const strings: I<%= componentName.pascal %>AdaptiveCardExtensionStrings;
  export = strings;
}
