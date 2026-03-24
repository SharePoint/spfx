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
import {
  SPFxTemplateRepositoryManager,
  PublicGitHubRepositorySource,
  SPFxTemplateWriter
} from '@microsoft/spfx-template-api';

// 1. Load templates from GitHub
const manager = new SPFxTemplateRepositoryManager();
manager.addSource(new PublicGitHubRepositorySource('https://github.com/SharePoint/spfx'));

const templates = await manager.getTemplatesAsync();
const template = templates.get('webpart-react');
if (!template) throw new Error('Template not found');

// 2. Render to an in-memory file system
const fs = await template.renderAsync(
  {
    solution_name: 'my-solution',
    libraryName: 'my-spfx-library',
    spfxVersion: template.spfxVersion,
    spfxVersionForBadgeUrl: template.spfxVersion.replace(/-/g, '--'),
    componentId: '<uuid>',
    featureId: '<uuid>',
    solutionId: '<uuid>',
    componentAlias: 'MyWebPart',
    componentNameUnescaped: 'My Web Part',
    componentNameCamelCase: 'myWebPart',
    componentNameHyphenCase: 'my-web-part',
    componentNameCapitalCase: 'MyWebPart',
    componentNameAllCaps: 'MY_WEB_PART',
    componentDescription: 'My Web Part description'
  },
  '/path/to/output'
);

// 3. Write files to disk (merges into existing SPFx solutions automatically)
const writer = new SPFxTemplateWriter();
await writer.writeAsync(fs, '/path/to/output');
```

---

## Template sources

### `PublicGitHubRepositorySource`

Fetches templates from a public GitHub repository. Pin a specific SPFx version with an optional branch/tag ref.

```typescript
import { PublicGitHubRepositorySource } from '@microsoft/spfx-template-api';

// Latest (default branch)
new PublicGitHubRepositorySource('https://github.com/SharePoint/spfx');

// Specific version
new PublicGitHubRepositorySource('https://github.com/SharePoint/spfx', '1.22');
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
import {
  SPFxTemplateRepositoryManager,
  PublicGitHubRepositorySource,
  LocalFileSystemRepositorySource
} from '@microsoft/spfx-template-api';

const manager = new SPFxTemplateRepositoryManager();
manager.addSource(new PublicGitHubRepositorySource('https://github.com/SharePoint/spfx'));
manager.addSource(new LocalFileSystemRepositorySource('./my-custom-templates'));

const templates = await manager.getTemplatesAsync();
```

---

## Writing to disk

`SPFxTemplateWriter` commits the in-memory `MemFsEditor` to the target directory. When scaffolding into an existing SPFx solution, it merges generated content into existing files rather than overwriting them.

```typescript
const writer = new SPFxTemplateWriter();
await writer.writeAsync(fs, targetDir);
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
| `SPFxTemplateRepositoryManager` | Aggregates sources and returns a `SPFxTemplateCollection` |
| `SPFxTemplateCollection` | `Map<string, SPFxTemplate>` of all loaded templates |
| `SPFxTemplate` | Single template — exposes `name`, `spfxVersion`, and `renderAsync()` |
| `PublicGitHubRepositorySource` | Loads templates from a public GitHub repo |
| `LocalFileSystemRepositorySource` | Loads templates from the local filesystem |
| `BaseSPFxTemplateRepositorySource` | Base class for building custom template sources |
| `SPFxRepositorySource` | Interface implemented by all source types |
| `SPFxTemplateWriter` | Writes a rendered `MemFsEditor` to disk with merge support |
| `IMergeHelper` | Interface for implementing custom merge helpers |
| `ServeJsonMergeHelper` | Merges `config/serve.json` (also available standalone) |
| `ISPFxTemplateJson` | Shape of the `template.json` manifest |
| `SPFxTemplateDefinitionSchema` | Zod schema for validating a `template.json` |
| `SPFxTemplateJsonFile` | Typed wrapper around a parsed `template.json` file |
| `SPFxTemplateRepositorySourceTypes` | Union type of all built-in repository source types |
| `IRenderOptions` | Context object passed to `template.renderAsync()` |

---

## License

MIT © Microsoft Corporation
