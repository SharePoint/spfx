declare interface I<%= componentNameCapitalCase %>FormCustomizerStrings {
  Save: string;
  Cancel: string;
  Close: string;
}

declare module '<%= componentNameCapitalCase %>FormCustomizerStrings' {
  const strings: I<%= componentNameCapitalCase %>FormCustomizerStrings;
  export = strings;
}
