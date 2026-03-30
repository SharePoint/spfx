declare interface I<%= componentName.pascal %>CommandSetStrings {
  Command1: string;
  Command2: string;
}

declare module '<%= componentName.pascal %>CommandSetStrings' {
  const strings: I<%= componentName.pascal %>CommandSetStrings;
  export = strings;
}
