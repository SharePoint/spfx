declare interface IMinimalCommandSetStrings {
  Command1: string;
  Command2: string;
}

declare module 'MinimalCommandSetStrings' {
  const strings: IMinimalCommandSetStrings;
  export = strings;
}
