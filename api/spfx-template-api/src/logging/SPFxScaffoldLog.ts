// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxScaffoldEvent } from './SPFxScaffoldEvent';

/**
 * An event with `timestamp` made optional so callers don't need to provide it.
 *
 * Distributes `Omit` over each member of the `SPFxScaffoldEvent` union instead of collapsing it.
 *
 * @public
 */
export type SPFxScaffoldEventInput = SPFxScaffoldEvent extends infer E
  ? E extends SPFxScaffoldEvent
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
  private readonly _events: SPFxScaffoldEvent[] = [];

  /**
   * Appends an event to the log.  If `timestamp` is omitted or empty
   * it will be replaced with the current ISO 8601 timestamp.
   */
  public append(event: SPFxScaffoldEventInput): void {
    const normalizedEvent: SPFxScaffoldEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    } as SPFxScaffoldEvent;
    this._events.push(normalizedEvent);
  }

  /** All events in insertion order (returns a defensive shallow copy). */
  public get events(): readonly SPFxScaffoldEvent[] {
    return this._events.slice();
  }

  /**
   * Returns only events whose `kind` matches the given value.
   */
  public getEventsOfKind<K extends SPFxScaffoldEvent['kind']>(
    kind: K
  ): Extract<SPFxScaffoldEvent, { kind: K }>[] {
    return this._events.filter((e): e is Extract<SPFxScaffoldEvent, { kind: K }> => e.kind === kind);
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
        log.append(JSON.parse(line) as SPFxScaffoldEvent);
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
        log.append(JSON.parse(line) as SPFxScaffoldEvent);
      }
    }
    return log;
  }
}
