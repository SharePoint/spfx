/**
 * Regex for validating solution names: must start with an alphanumeric character
 * and contain only alphanumeric characters, hyphens, and underscores.
 */
export const SOLUTION_NAME_PATTERN: RegExp = /^[a-zA-Z0-9][a-zA-Z0-9-_]*$/;
