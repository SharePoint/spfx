declare interface I<%= componentNameCapitalCase %>LibraryStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
}

declare module '<%= componentNameCapitalCase %>LibraryStrings' {
  const strings: I<%= componentNameCapitalCase %>LibraryStrings;
  export = strings;
}
