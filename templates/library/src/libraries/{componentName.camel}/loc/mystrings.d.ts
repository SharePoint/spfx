declare interface I<%= componentName.pascal %>LibraryStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
}

declare module '<%= componentName.pascal %>LibraryStrings' {
  const strings: I<%= componentName.pascal %>LibraryStrings;
  export = strings;
}
