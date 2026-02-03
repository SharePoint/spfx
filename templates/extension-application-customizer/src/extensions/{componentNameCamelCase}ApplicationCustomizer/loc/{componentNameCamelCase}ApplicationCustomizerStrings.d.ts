declare interface I<%= componentNameCapitalCase %>ApplicationCustomizerStrings {
  Title: string;
}

declare module '<%= componentNameCapitalCase %>ApplicationCustomizerStrings' {
  const strings: I<%= componentNameCapitalCase %>ApplicationCustomizerStrings;
  export = strings;
}
