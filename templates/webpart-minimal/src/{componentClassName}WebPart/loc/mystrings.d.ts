declare interface I<%= componentStrings %> {
}

declare module '<%= componentStrings %>' {
  const strings: I<%= componentStrings %>;
  export = strings;
}
