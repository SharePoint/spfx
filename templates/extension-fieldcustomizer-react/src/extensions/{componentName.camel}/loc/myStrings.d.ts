declare interface I<%= componentName.pascal %>FieldCustomizerStrings {
  Title: string;
}

declare module '<%= componentName.pascal %>FieldCustomizerStrings' {
  const strings: I<%= componentName.pascal %>FieldCustomizerStrings;
  export = strings;
}
