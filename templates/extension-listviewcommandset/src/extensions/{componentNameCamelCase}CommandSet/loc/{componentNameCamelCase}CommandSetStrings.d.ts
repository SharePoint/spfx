declare interface I<%= componentNameCapitalCase %>CommandSetStrings {
  Command1: string;
  Command2: string;
}

declare module '<%= componentNameCapitalCase %>CommandSetStrings' {
  const strings: I<%= componentNameCapitalCase %>CommandSetStrings;
  export = strings;
}
