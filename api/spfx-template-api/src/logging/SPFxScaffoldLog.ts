// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxScaffoldEvent } from './SPFxScaffoldEvent';

// Distributes Omit over each member of a union instead of collapsing it.
type _DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * An event with `timestamp` made optional so callers don't need to provide it.
 *
 * @public
 */
export type SPFxScaffoldEventInput = _DistributiveOmit<SPFxScaffoldEvent, 'timestamp'> & {
  timestamp?: string;
};

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
    const timestamp: string = event.timestamp || new Date().toISOString();
    this._events.push({ ...event, timestamp } as SPFxScaffoldEvent);
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
    for (let i: number = 0; i <= content.length; i++) {
      if (i === content.length || content[i] === '\n') {
        if (i > start) {
          log.append(JSON.parse(content.substring(start, i)) as SPFxScaffoldEvent);
        }
        start = i + 1;
      }
    }
    return log;
  }
}
