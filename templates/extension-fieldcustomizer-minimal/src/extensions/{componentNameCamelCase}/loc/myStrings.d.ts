declare interface I<%= componentNameCapitalCase %>FieldCustomizerStrings {
  Title: string;
}

declare module '<%= componentNameCapitalCase %>FieldCustomizerStrings' {
  const strings: I<%= componentNameCapitalCase %>FieldCustomizerStrings;
  export = strings;
}
