declare interface I<%= componentName.pascal %>CopilotComponentStrings {
  ExpandButtonLabel: string;
  OpenSiteButtonLabel: string;
  FollowUpButtonLabel: string;
  ResizeButtonLabel: string;
  CompactButtonLabel: string;
  SiteBadgePrefix: string;
  ThemeBadgePrefix: string;
  ModeBadgePrefix: string;
  GreetingPrefix: string;
  UnknownTheme: string;
  DefaultDisplayMode: string;
  FollowUpMessage: string;
}

declare module '<%= componentName.pascal %>CopilotComponentStrings' {
  const strings: I<%= componentName.pascal %>CopilotComponentStrings;
  export = strings;
}
