# @microsoft/spfx-template-api

> **Pre-release:** APIs may change before the stable 1.0 release.

Programmatic API for loading, rendering, and writing [SharePoint Framework (SPFx)](https://aka.ms/spfx) project templates. This is the engine that powers [`@microsoft/spfx-cli`](https://www.npmjs.com/package/@microsoft/spfx-cli). Use it directly when you need to integrate SPFx scaffolding into your own tooling.

```bash
npm install @microsoft/spfx-template-api
```

**Requires Node.js `>=22.14.0 <23.0.0` or `>=24.12.0 <25.0.0`**

---

## Quick start

```typescript
import { Terminal, ConsoleTerminalProvider } from '@rushstack/terminal';
import {
  SPFxTemplateRepositoryManager,
  PublicGitHubRepositorySource,
  SPFxTemplateWriter
} from '@microsoft/spfx-template-api';

const terminal = new Terminal(new ConsoleTerminalProvider());

// 1. Load templates from GitHub
const manager = new SPFxTemplateRepositoryManager();
manager.addSource(new PublicGitHubRepositorySource({ repoUrl: 'https://github.com/SharePoint/spfx', terminal }));

const templates = await manager.getTemplatesAsync();
const template = templates.get('webpart-react');
if (!template) throw new Error('Template not found');

// 2. Render to an in-memory file system
// String values are automatically wrapped with casing helpers (e.g. componentName.pascal)
const templateFs = await template.renderAsync({
  solution_name: 'my-solution',
  libraryName: 'my-spfx-library',
  spfxVersion: template.spfxVersion,
  spfxVersionForBadgeUrl: template.spfxVersion.replace(/-/g, '--'),
  componentId: '<uuid>',
  featureId: '<uuid>',
  solutionId: '<uuid>',
  componentAlias: 'MyWebPart',
  componentName: 'My Web Part',
  componentDescription: 'My Web Part description'
});

// 3. Write files to disk (merges into existing SPFx solutions automatically)
const writer = new SPFxTemplateWriter();
await writer.writeAsync(templateFs, '/path/to/output');
```

---

## Template sources

### `PublicGitHubRepositorySource`

Fetches templates from a GitHub repository (github.com or GitHub Enterprise). Pin a specific SPFx version with an optional branch/tag ref. An optional `token` enables access to GitHub Enterprise instances or private repositories on github.com.

```typescript
import { Terminal, ConsoleTerminalProvider } from '@rushstack/terminal';
import { PublicGitHubRepositorySource } from '@microsoft/spfx-template-api';

const terminal = new Terminal(new ConsoleTerminalProvider());

// Latest (defaults to the version/latest branch)
new PublicGitHubRepositorySource({ repoUrl: 'https://github.com/SharePoint/spfx', terminal });

// Specific version
new PublicGitHubRepositorySource({ repoUrl: 'https://github.com/SharePoint/spfx', branch: 'version/1.22', terminal });

// GitHub Enterprise with authentication
new PublicGitHubRepositorySource({
  repoUrl: 'https://github.mycompany.com/org/spfx-templates',
  terminal,
  token: process.env.GITHUB_TOKEN
});
```

### `LocalFileSystemRepositorySource`

Loads templates from a local directory — useful for offline workflows, CI environments, or authoring custom templates.

```typescript
import { LocalFileSystemRepositorySource } from '@microsoft/spfx-template-api';

new LocalFileSystemRepositorySource('./path/to/templates');
```

### Combining sources

`SPFxTemplateRepositoryManager` merges templates from all registered sources. Later sources can override templates from earlier ones.

```typescript
import { Terminal, ConsoleTerminalProvider } from '@rushstack/terminal';
import {
  SPFxTemplateRepositoryManager,
  PublicGitHubRepositorySource,
  LocalFileSystemRepositorySource
} from '@microsoft/spfx-template-api';

const terminal = new Terminal(new ConsoleTerminalProvider());
const manager = new SPFxTemplateRepositoryManager();
manager.addSource(new PublicGitHubRepositorySource({ repoUrl: 'https://github.com/SharePoint/spfx', terminal }));
manager.addSource(new LocalFileSystemRepositorySource('./my-custom-templates'));

const templates = await manager.getTemplatesAsync();
```

---

## Writing to disk

`SPFxTemplateWriter` writes the in-memory `TemplateOutput` to the target directory. When scaffolding into an existing SPFx solution, it intelligently merges known config files (package.json, serve.json, etc.) via registered merge helpers. Unregistered text files that already exist on disk are preserved; binary files and new files are written directly.

```typescript
const writer = new SPFxTemplateWriter();
await writer.writeAsync(templateFs, targetDir);
```

### Merge helpers

The writer uses these helpers internally. You can also import them directly for custom merge scenarios:

| Class | Merges |
|-------|--------|
| `JsonMergeHelper` | Abstract base for JSON/JSONC merge helpers (parse/serialize utilities) |
| `PackageJsonMergeHelper` | `package.json` (preserves existing scripts and dependencies) |
| `ConfigJsonMergeHelper` | SPFx `config/` files |
| `PackageSolutionJsonMergeHelper` | `config/package-solution.json` |
| `ServeJsonMergeHelper` | `config/serve.json` |

---

## API reference

| Export | Description |
|--------|-------------|
| `ICasedString` | Interface exposing `.camel`, `.pascal`, `.hyphen`, `.allCaps`; auto-applied to all string context values during rendering |
| `createCasedString` | Factory function that creates an `ICasedString` from a raw string |
| `SPFxTemplateRepositoryManager` | Aggregates sources and returns a `SPFxTemplateCollection` |
| `SPFxTemplateCollection` | `Map<string, SPFxTemplate>` of all loaded templates |
| `SPFxTemplate` | Single template — exposes `name`, `category`, `spfxVersion`, and `renderAsync()` |
| `ITemplateOutputEntry` | A single file entry (text or binary contents) |
| `TemplateOutput` | In-memory file system implementation backed by a `Map`, returned by `renderAsync()` |
| `PublicGitHubRepositorySource` | Loads templates from a GitHub repo (github.com or GHE, with optional auth token) |
| `LocalFileSystemRepositorySource` | Loads templates from the local filesystem |
| `BaseSPFxTemplateRepositorySource` | Base class for building custom template sources |
| `SPFxRepositorySource` | Interface implemented by all source types |
| `SPFxTemplateWriter` | Writes a `TemplateOutput` to disk with merge support |
| `IWriteOptions` | Options for `SPFxTemplateWriter.writeAsync()` (includes optional `log`) |
| `IMergeHelper` | Interface for implementing custom merge helpers |
| `ServeJsonMergeHelper` | Merges `config/serve.json` (also available standalone) |
| `SPFxScaffoldLog` | Append-only event log for recording scaffolding operations; serializes to JSONL |
| `SPFxScaffoldEventInput` | Input type for `SPFxScaffoldLog.append()` (timestamp is optional) |
| `SPFxScaffoldEvent` | Discriminated union of all scaffold event types |
| `ISPFxScaffoldEventBase` | Base interface shared by every scaffold event (`kind` + `timestamp`) |
| `ITemplateRenderedEvent` | Event recorded after a template is rendered |
| `IPackageManagerSelectedEvent` | Event recorded when a package manager is chosen |
| `IFileWriteEvent` | Event recorded for each file written during the write phase |
| `FileWriteOutcome` | Union type: `'new' \| 'merged' \| 'preserved' \| 'unchanged'` |
| `IPackageManagerInstallCompletedEvent` | Event recorded after the package-manager install exits |
| `SPFxTemplateCategory` | Union type of template categories: `'webpart' | 'extension' | 'ace' | 'library'` |
| `SPFX_TEMPLATE_CATEGORIES` | Array of all valid category values (useful for validation/iteration) |
| `ENGINE_VERSION` | Semver string identifying the installed engine version (matches `package.json` version) |
| `ISPFxTemplateJson` | Shape of the `template.json` manifest (includes `category`, optional `minimumEngineVersion`) |
| `SPFxTemplateDefinitionSchema` | Zod schema for validating a `template.json` (uses passthrough mode for forward compatibility) |
| `SPFxTemplateJsonFile` | Typed wrapper around a parsed `template.json` file |
| `SPFxTemplateRepositorySourceKind` | Union type of all built-in repository source kinds (`'local' | 'github'`) |
| `IPublicGitHubRepositorySourceOptions` | Options object for constructing a `PublicGitHubRepositorySource` |
| `IRenderOptions` | Context object passed to `template.renderAsync()` |

---

## Scaffold event log

`SPFxScaffoldLog` records structured events during scaffolding. Pass it to `writeAsync()` to capture file-write outcomes, then serialize for debugging or analytics.

```typescript
import { SPFxScaffoldLog, SPFxTemplateWriter, type IFileWriteEvent } from '@microsoft/spfx-template-api';

const log = new SPFxScaffoldLog();

// Record custom events
log.append({ kind: 'template-rendered', templateName: 'webpart-react', templateVersion: '1.0.0', spfxVersion: '1.22.0', context: { componentName: 'MyWebPart' }, cliVersion: '0.1.0' });

// Pass to writer to auto-record file-write events
const writer = new SPFxTemplateWriter();
await writer.writeAsync(templateFs, targetDir, { log });

// Query events by kind
const fileWrites: IFileWriteEvent[] = log.getEventsOfKind('file-write');

// Serialize to JSONL for persistence
const jsonl: string = log.toJsonl();

// Restore from JSONL
const restored = SPFxScaffoldLog.fromJsonl(jsonl);
```

---

## License

MIT © Microsoft Corporation
