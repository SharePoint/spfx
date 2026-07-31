declare interface I<%= componentName.pascal %>CopilotComponentStrings {
  UnknownTheme: string;
  ExpandToFullscreenTitle: string;
  WelcomeGreeting: string;
  DisplayModeLabel: string;
  ThemeLabel: string;
  MessageLabel: string;
}

declare module '<%= componentName.pascal %>CopilotComponentStrings' {
  const strings: I<%= componentName.pascal %>CopilotComponentStrings;
  export = strings;
}
