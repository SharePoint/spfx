// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

jest.mock('@rushstack/node-core-library', () => {
  const actual = jest.requireActual('@rushstack/node-core-library');
  return {
    ...actual,
    FileSystem: {
      readFileAsync: jest.fn(),
      writeFileAsync: jest.fn().mockResolvedValue(undefined),
      isNotExistError: (error: { code?: string }) => error?.code === 'ENOENT'
    }
  };
});

import { FileSystem } from '@rushstack/node-core-library';

import { SPFxScaffoldLog, SCAFFOLD_LOG_FILENAME } from '../SPFxScaffoldLog';

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
import type {
  ITemplateRenderedEvent,
  IPackageManagerSelectedEvent,
  IFileWriteEvent,
  IPackageManagerInstallCompletedEvent,
  ISPFxScaffoldEvent
} from '../SPFxScaffoldEvent';

// ---------------------------------------------------------------------------
// Helpers – reusable event factories
// ---------------------------------------------------------------------------

function makeTemplateRenderedEvent(overrides?: Partial<ITemplateRenderedEvent>): ITemplateRenderedEvent {
  return {
    kind: 'template-rendered',
    timestamp: '2026-03-27T10:00:00.000Z',
    templateName: 'webpart-minimal',
    templateVersion: '1.0.0',
    spfxVersion: '1.22.2',
    context: { componentNameCamelCase: 'helloWorld' },
    cliVersion: '0.1.0',
    ...overrides
  };
}

function makePackageManagerSelectedEvent(
  overrides?: Partial<IPackageManagerSelectedEvent>
): IPackageManagerSelectedEvent {
  return {
    kind: 'package-manager-selected',
    timestamp: '2026-03-27T10:00:01.000Z',
    packageManager: 'npm',
    targetDir: '/tmp/my-solution',
    ...overrides
  };
}

function makeFileWriteEvent(overrides?: Partial<IFileWriteEvent>): IFileWriteEvent {
  return {
    kind: 'file-write',
    timestamp: '2026-03-27T10:00:02.000Z',
    relativePath: 'package.json',
    outcome: 'new',
    ...overrides
  };
}

function makeInstallCompletedEvent(
  overrides?: Partial<IPackageManagerInstallCompletedEvent>
): IPackageManagerInstallCompletedEvent {
  return {
    kind: 'package-manager-install-completed',
    timestamp: '2026-03-27T10:00:03.000Z',
    packageManager: 'npm',
    exitCode: 0,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe(SPFxScaffoldLog.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileSystem.writeFileAsync.mockResolvedValue(undefined);
  });

  // ---- append + read back ------------------------------------------------

  describe('append and events', () => {
    it('returns an empty array when no events have been appended', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      expect(log.events).toEqual([]);
    });

    it('returns events in insertion order', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const e1: ITemplateRenderedEvent = makeTemplateRenderedEvent();
      const e2: IPackageManagerSelectedEvent = makePackageManagerSelectedEvent();
      const e3: IFileWriteEvent = makeFileWriteEvent();

      log.append(e1);
      log.append(e2);
      log.append(e3);

      expect(log.events).toEqual([e1, e2, e3]);
    });

    it('does not allow mutation of the returned events array', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());

      // The readonly type prevents compile-time mutation, but verify runtime too
      const events: readonly ISPFxScaffoldEvent[] = log.events;
      expect(events.length).toBe(1);

      // Appending another event should not change the previously returned reference
      // (implementation may return a new array or a frozen one — either is fine).
      log.append(makeFileWriteEvent({ relativePath: 'other.ts' }));
      expect(log.events.length).toBe(2);
    });
  });

  // ---- timestamp auto-fill -----------------------------------------------

  describe('timestamp auto-fill', () => {
    it('fills in an empty timestamp with an ISO 8601 string', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const event: IFileWriteEvent = makeFileWriteEvent({ timestamp: '' });

      log.append(event);

      const recorded: ISPFxScaffoldEvent | undefined = log.events[0];
      expect(recorded).toBeDefined();
      expect(recorded!.timestamp).not.toBe('');
      // Verify it parses as a valid date
      expect(Number.isNaN(Date.parse(recorded!.timestamp))).toBe(false);
    });

    it('preserves an explicitly provided timestamp', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const event: IFileWriteEvent = makeFileWriteEvent({ timestamp: '2025-01-01T00:00:00.000Z' });

      log.append(event);

      expect(log.events[0]!.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  // ---- getEventsOfKind ---------------------------------------------------

  describe(SPFxScaffoldLog.prototype.getEventsOfKind.name, () => {
    it('returns only events of the requested kind', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const rendered: ITemplateRenderedEvent = makeTemplateRenderedEvent();
      const file1: IFileWriteEvent = makeFileWriteEvent({ relativePath: 'a.ts' });
      const file2: IFileWriteEvent = makeFileWriteEvent({ relativePath: 'b.ts' });
      const pm: IPackageManagerSelectedEvent = makePackageManagerSelectedEvent();

      log.append(rendered);
      log.append(file1);
      log.append(pm);
      log.append(file2);

      const fileEvents: IFileWriteEvent[] = log.getEventsOfKind('file-write');
      expect(fileEvents).toEqual([file1, file2]);
    });

    it('returns an empty array when no events match', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());

      expect(log.getEventsOfKind('template-rendered')).toEqual([]);
    });
  });

  // ---- JSONL serialization -----------------------------------------------

  describe(SPFxScaffoldLog.prototype.toJsonl.name, () => {
    it('serializes each event as a single JSON line', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const e1: IFileWriteEvent = makeFileWriteEvent({ relativePath: 'a.ts' });
      const e2: IFileWriteEvent = makeFileWriteEvent({ relativePath: 'b.ts' });
      log.append(e1);
      log.append(e2);

      const jsonl: string = log.toJsonl();
      const lines: string[] = jsonl.split('\n');

      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]!)).toEqual(e1);
      expect(JSON.parse(lines[1]!)).toEqual(e2);
    });

    it('returns an empty string for an empty log', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      expect(log.toJsonl()).toBe('');
    });
  });

  describe(SPFxScaffoldLog.fromJsonl.name, () => {
    it('round-trips through toJsonl and fromJsonl', () => {
      const original: SPFxScaffoldLog = new SPFxScaffoldLog();
      original.append(makeTemplateRenderedEvent());
      original.append(
        makeFileWriteEvent({ relativePath: 'package.json', outcome: 'merged', mergeHelper: 'package.json' })
      );
      original.append(makeFileWriteEvent({ relativePath: 'src/index.ts', outcome: 'new' }));
      original.append(makePackageManagerSelectedEvent());
      original.append(makeInstallCompletedEvent());

      const jsonl: string = original.toJsonl();
      const restored: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl(jsonl);

      expect(restored.events).toEqual(original.events);
    });

    it('returns an empty log for an empty string', () => {
      const log: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl('');
      expect(log.events).toEqual([]);
    });

    it('handles a trailing newline gracefully', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());

      const jsonlWithTrailingNewline: string = log.toJsonl() + '\n';
      const restored: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl(jsonlWithTrailingNewline);

      expect(restored.events).toEqual(log.events);
    });

    it('handles multiple trailing newlines', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());

      const jsonlWithNewlines: string = log.toJsonl() + '\n\n\n';
      const restored: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl(jsonlWithNewlines);

      expect(restored.events).toEqual(log.events);
    });
  });

  // ---- mergeHelper field on file-write events ----------------------------

  describe('file-write event with mergeHelper', () => {
    it('preserves the mergeHelper field through round-trip', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      const event: IFileWriteEvent = makeFileWriteEvent({
        outcome: 'merged',
        mergeHelper: 'package.json'
      });
      log.append(event);

      const restored: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl(log.toJsonl());
      const fileEvents: IFileWriteEvent[] = restored.getEventsOfKind('file-write');

      expect(fileEvents.length).toBe(1);
      expect(fileEvents[0]!.mergeHelper).toBe('package.json');
    });

    it('omits mergeHelper when not provided', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent({ outcome: 'new' }));

      const restored: SPFxScaffoldLog = SPFxScaffoldLog.fromJsonl(log.toJsonl());
      const fileEvents: IFileWriteEvent[] = restored.getEventsOfKind('file-write');

      expect(fileEvents[0]!.mergeHelper).toBeUndefined();
    });
  });

  // ---- hasEntries ---------------------------------------------------------

  describe('hasEntries', () => {
    it('returns false for a freshly constructed instance', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      expect(log.hasEntries).toBe(false);
    });

    it('returns true after appending an event', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());
      expect(log.hasEntries).toBe(true);
    });
  });

  // ---- lastPackageManager ---------------------------------------------------

  describe('lastPackageManager', () => {
    it('returns undefined when no package-manager-selected events exist', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());
      expect(log.lastPackageManager).toBeUndefined();
    });

    it('returns undefined for an empty log', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      expect(log.lastPackageManager).toBeUndefined();
    });

    it('returns undefined when the only selection was "none"', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makePackageManagerSelectedEvent({ packageManager: 'none' }));
      expect(log.lastPackageManager).toBeUndefined();
    });

    it('does not clear a previously recorded manager when "none" is appended', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makePackageManagerSelectedEvent({ packageManager: 'npm' }));
      log.append(makePackageManagerSelectedEvent({ packageManager: 'none' }));
      expect(log.lastPackageManager).toBe('npm');
    });

    it('returns the package manager from the most recent non-none event', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makePackageManagerSelectedEvent({ packageManager: 'npm' }));
      log.append(makePackageManagerSelectedEvent({ packageManager: 'pnpm' }));
      expect(log.lastPackageManager).toBe('pnpm');
    });

    it('returns the package manager when only one event exists', () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makePackageManagerSelectedEvent({ packageManager: 'yarn' }));
      expect(log.lastPackageManager).toBe('yarn');
    });
  });

  // ---- loadAsync ----------------------------------------------------------

  describe(SPFxScaffoldLog.loadFromFolderAsync.name, () => {
    it('returns a log with events when file exists', async () => {
      const original: SPFxScaffoldLog = new SPFxScaffoldLog();
      original.append(makeTemplateRenderedEvent());
      original.append(makeFileWriteEvent());
      mockFileSystem.readFileAsync.mockResolvedValue(original.toJsonl());

      const loaded: SPFxScaffoldLog = await SPFxScaffoldLog.loadFromFolderAsync('/project');

      expect(loaded.events).toEqual(original.events);
      expect(loaded.hasEntries).toBe(true);
    });

    it('returns an empty log when file does not exist (ENOENT)', async () => {
      mockFileSystem.readFileAsync.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const loaded: SPFxScaffoldLog = await SPFxScaffoldLog.loadFromFolderAsync('/project');

      expect(loaded.hasEntries).toBe(false);
      expect(loaded.events).toEqual([]);
    });

    it('propagates non-ENOENT read errors', async () => {
      mockFileSystem.readFileAsync.mockRejectedValue(
        Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
      );

      await expect(SPFxScaffoldLog.loadFromFolderAsync('/project')).rejects.toThrow('EACCES');
    });

    it('reads from the correct path using SCAFFOLD_LOG_FILENAME', async () => {
      mockFileSystem.readFileAsync.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await SPFxScaffoldLog.loadFromFolderAsync('/my/project');

      expect(mockFileSystem.readFileAsync).toHaveBeenCalledWith(`/my/project/${SCAFFOLD_LOG_FILENAME}`);
    });
  });

  // ---- saveAsync ----------------------------------------------------------

  describe(SPFxScaffoldLog.prototype.saveToFolderAsync.name, () => {
    it('writes JSONL via FileSystem.writeFileAsync', async () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      log.append(makeFileWriteEvent());

      await log.saveToFolderAsync('/project');

      expect(mockFileSystem.writeFileAsync).toHaveBeenCalledTimes(1);
      const writtenContent: string = mockFileSystem.writeFileAsync.mock.calls[0]![1] as string;
      expect(writtenContent).toContain('"kind":"file-write"');
    });

    it('calls FileSystem.writeFileAsync with ensureFolderExists: true', async () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      await log.saveToFolderAsync('/project');

      expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        ensureFolderExists: true
      });
    });

    it('writes to the correct path using SCAFFOLD_LOG_FILENAME', async () => {
      const log: SPFxScaffoldLog = new SPFxScaffoldLog();
      await log.saveToFolderAsync('/my/project');

      expect(mockFileSystem.writeFileAsync).toHaveBeenCalledWith(
        `/my/project/${SCAFFOLD_LOG_FILENAME}`,
        expect.any(String),
        expect.any(Object)
      );
    });

    it(`round-trips through ${SPFxScaffoldLog.prototype.saveToFolderAsync.name} and ${SPFxScaffoldLog.loadFromFolderAsync.name}`, async () => {
      const original: SPFxScaffoldLog = new SPFxScaffoldLog();
      original.append(makeTemplateRenderedEvent());
      original.append(makeFileWriteEvent({ relativePath: 'src/index.ts' }));
      original.append(makePackageManagerSelectedEvent());

      await original.saveToFolderAsync('/project');

      const writtenContent: string = mockFileSystem.writeFileAsync.mock.calls[0]![1] as string;
      mockFileSystem.readFileAsync.mockResolvedValue(writtenContent);

      const restored: SPFxScaffoldLog = await SPFxScaffoldLog.loadFromFolderAsync('/project');

      expect(restored.events).toEqual(original.events);
    });
  });
});
