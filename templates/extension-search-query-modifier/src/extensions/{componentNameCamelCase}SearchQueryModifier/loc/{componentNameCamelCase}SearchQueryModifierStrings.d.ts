declare interface I<%= componentNameCapitalCase %>SearchQueryModifierStrings {
  Title: string;
}

declare module '<%= componentNameCapitalCase %>SearchQueryModifierStrings' {
  const strings: I<%= componentNameCapitalCase %>SearchQueryModifierStrings;
  export = strings;
}
