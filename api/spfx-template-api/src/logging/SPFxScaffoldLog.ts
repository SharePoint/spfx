// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { SPFxScaffoldEvent } from './SPFxScaffoldEvent';

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
   * Appends an event to the log.  If `event.timestamp` is an empty string
   * it will be replaced with the current ISO 8601 timestamp.
   */
  public append(event: SPFxScaffoldEvent): void {
    if (event.timestamp === '') {
      event = { ...event, timestamp: new Date().toISOString() };
    }
    this._events.push(event);
  }

  /** All events in insertion order. */
  public get events(): readonly SPFxScaffoldEvent[] {
    return this._events;
  }

  /**
   * Returns only events whose `kind` matches the given value.
   */
  public getEventsByKind<K extends SPFxScaffoldEvent['kind']>(
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
    const lines: string[] = content.split('\n').filter((line) => line.length > 0);
    for (const line of lines) {
      log._events.push(JSON.parse(line) as SPFxScaffoldEvent);
    }
    return log;
  }
}
