declare interface IExampleLibraryStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  DescriptionFieldLabel: string;
}

declare module 'ExampleLibraryStrings' {
  const strings: IExampleLibraryStrings;
  export = strings;
}
