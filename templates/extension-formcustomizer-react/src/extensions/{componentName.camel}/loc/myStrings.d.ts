declare interface I<%= componentName.pascal %>FormCustomizerStrings {
  Save: string;
  Cancel: string;
  Close: string;
}

declare module '<%= componentName.pascal %>FormCustomizerStrings' {
  const strings: I<%= componentName.pascal %>FormCustomizerStrings;
  export = strings;
}
