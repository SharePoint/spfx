// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { FileSystem } from '@rushstack/node-core-library';

import type { IPackageManagerSelectedEvent, ISPFxScaffoldEvent } from './SPFxScaffoldEvent';

/**
 * The well-known filename for the persisted scaffold log.
 *
 * @public
 */
export const SCAFFOLD_LOG_FILENAME: string = '.spfx-scaffold.jsonl';

/**
 * An event with `timestamp` made optional so callers don't need to provide it.
 *
 * Distributes `Omit` over each member of the `ISPFxScaffoldEvent` union instead of collapsing it.
 *
 * @public
 */
export type ISPFxScaffoldEventInput = ISPFxScaffoldEvent extends infer E
  ? E extends ISPFxScaffoldEvent
    ? Omit<E, 'timestamp'> & { timestamp?: string }
    : never
  : never;

/**
 * A structured log of events emitted during a scaffolding operation.
 *
 * Events can be appended as work progresses and later serialized to JSONL
 * (one JSON object per line) for persistence or debugging.  The same class
 * handles deserialization so the log can be read back.
 *
 * @public
 */
export class SPFxScaffoldLog {
  private readonly _events: ISPFxScaffoldEvent[] = [];
  private _lastPackageManager: string | undefined;

  /**
   * Appends an event to the log.  If `timestamp` is omitted or empty
   * it will be replaced with the current ISO 8601 timestamp.
   */
  public append(event: ISPFxScaffoldEventInput): void {
    const normalizedEvent: ISPFxScaffoldEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    } as ISPFxScaffoldEvent;
    this._events.push(normalizedEvent);

    if (normalizedEvent.kind === 'package-manager-selected') {
      const pm: string = (normalizedEvent as IPackageManagerSelectedEvent).packageManager;
      if (pm !== 'none') {
        this._lastPackageManager = pm;
      }
    }
  }

  /** Whether the log contains any events. */
  public get hasEntries(): boolean {
    return this._events.length > 0;
  }

  /** All events in insertion order (returns a defensive shallow copy). */
  public get events(): readonly ISPFxScaffoldEvent[] {
    return this._events.slice();
  }

  /**
   * Returns only events whose `kind` matches the given value.
   */
  public getEventsOfKind<K extends ISPFxScaffoldEvent['kind']>(
    kind: K
  ): Extract<ISPFxScaffoldEvent, { kind: K }>[] {
    return this._events.filter((e): e is Extract<ISPFxScaffoldEvent, { kind: K }> => e.kind === kind);
  }

  /**
   * Returns the package manager from the most recent `package-manager-selected`
   * event, or `undefined` if none has been recorded or the last selection was `'none'`.
   *
   * @remarks
   * This value is cached and updated incrementally on each {@link SPFxScaffoldLog.append}
   * call, so reading it is O(1).
   */
  public get lastPackageManager(): string | undefined {
    return this._lastPackageManager;
  }

  /** Serializes the log to JSONL (one JSON object per line, no trailing newline). */
  public toJsonl(): string {
    return this._events.map((e) => JSON.stringify(e)).join('\n');
  }

  /** Deserializes a JSONL string into a new {@link SPFxScaffoldLog}. */
  public static fromJsonl(content: string): SPFxScaffoldLog {
    const log: SPFxScaffoldLog = new SPFxScaffoldLog();
    if (content.length === 0) {
      return log;
    }
    let start: number = 0;
    let newlineIndex: number = content.indexOf('\n', start);
    while (newlineIndex !== -1) {
      let line: string = content.substring(start, newlineIndex);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      if (line.length > 0) {
        log.append(JSON.parse(line) as ISPFxScaffoldEvent);
      }
      start = newlineIndex + 1;
      newlineIndex = content.indexOf('\n', start);
    }
    // Handle the last line (no trailing newline)
    if (start < content.length) {
      let line: string = content.substring(start);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      if (line.length > 0) {
        log.append(JSON.parse(line) as ISPFxScaffoldEvent);
      }
    }
    return log;
  }

  /**
   * Loads a scaffold log from disk. Returns an empty log if the file does not exist.
   */
  public static async loadFromFolderAsync(targetDir: string): Promise<SPFxScaffoldLog> {
    const filePath: string = `${targetDir}/${SCAFFOLD_LOG_FILENAME}`;
    let content: string;
    try {
      content = await FileSystem.readFileAsync(filePath);
    } catch (error) {
      if (FileSystem.isNotExistError(error)) {
        return new SPFxScaffoldLog();
      }
      throw error;
    }
    return SPFxScaffoldLog.fromJsonl(content);
  }

  /**
   * Persists the scaffold log to disk as {@link SCAFFOLD_LOG_FILENAME}.
   */
  public async saveToFolderAsync(targetDir: string): Promise<void> {
    const filePath: string = `${targetDir}/${SCAFFOLD_LOG_FILENAME}`;
    const content: string = this._events.length > 0 ? this.toJsonl() + '\n' : '';
    await FileSystem.writeFileAsync(filePath, content, { ensureFolderExists: true });
  }
}
