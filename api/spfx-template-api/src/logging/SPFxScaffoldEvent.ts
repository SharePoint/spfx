// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * Base shape shared by every scaffold event.
 *
 * @public
 */
export interface ISPFxScaffoldEventBase {
  /** Discriminant that identifies the event kind. */
  kind: string;
  /** ISO 8601 timestamp of when the event occurred. */
  timestamp: string;
}

/**
 * Recorded at the start of each `spfx create` invocation.
 *
 * @public
 */
export interface ISessionStartedEvent extends ISPFxScaffoldEventBase {
  kind: 'session-started';
  cliVersion: string;
}

/**
 * Recorded after a template has been rendered into the in-memory file system.
 *
 * @public
 */
export interface ITemplateRenderedEvent extends ISPFxScaffoldEventBase {
  kind: 'template-rendered';
  templateName: string;
  templateVersion: string;
  spfxVersion: string;
  context: Record<string, string>;
  cliVersion: string;
}

/**
 * Recorded when the user selects a package manager (including "none").
 *
 * @public
 */
export interface IPackageManagerSelectedEvent extends ISPFxScaffoldEventBase {
  kind: 'package-manager-selected';
  packageManager: string;
  targetDir: string;
}

/**
 * The outcome of a single file during the write phase.
 *
 * - `'new'` -- The file was written as-is (either it did not previously exist, or it is a binary
 *   file whose contents differ from the existing file on disk).
 * - `'merged'` -- The file existed on disk and was merged using a registered merge helper.
 * - `'preserved'` -- The file existed on disk with different content but no merge helper was
 *   registered, so the existing file was kept.
 * - `'unchanged'` -- The file existed on disk with identical content, so no write was needed.
 *
 * @public
 */
export type FileWriteOutcome = 'new' | 'merged' | 'preserved' | 'unchanged';

/**
 * Recorded for each non-deleted file with non-null contents processed by {@link SPFxTemplateWriter}.
 *
 * @public
 */
export interface IFileWriteEvent extends ISPFxScaffoldEventBase {
  kind: 'file-write';
  relativePath: string;
  outcome: FileWriteOutcome;
  /**
   * @remarks
   * Present only when `outcome` is `'merged'`.
   */
  mergeHelper?: string;
}

/**
 * Recorded after the package-manager install process exits.
 *
 * @public
 */
export interface IPackageManagerInstallCompletedEvent extends ISPFxScaffoldEventBase {
  kind: 'package-manager-install-completed';
  packageManager: string;
  exitCode: number;
  signal?: string;
}

/**
 * Discriminated union of all scaffold event types.
 *
 * @public
 */
export type ISPFxScaffoldEvent =
  | ISessionStartedEvent
  | ITemplateRenderedEvent
  | IPackageManagerSelectedEvent
  | IFileWriteEvent
  | IPackageManagerInstallCompletedEvent;
