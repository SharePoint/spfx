declare interface I<%= componentName.pascal %>SearchQueryModifierStrings {
  Title: string;
}

declare module '<%= componentName.pascal %>SearchQueryModifierStrings' {
  const strings: I<%= componentName.pascal %>SearchQueryModifierStrings;
  export = strings;
}
