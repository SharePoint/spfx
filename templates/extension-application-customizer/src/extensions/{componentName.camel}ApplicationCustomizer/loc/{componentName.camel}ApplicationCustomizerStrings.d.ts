declare interface I<%= componentName.pascal %>ApplicationCustomizerStrings {
  Title: string;
}

declare module '<%= componentName.pascal %>ApplicationCustomizerStrings' {
  const strings: I<%= componentName.pascal %>ApplicationCustomizerStrings;
  export = strings;
}
