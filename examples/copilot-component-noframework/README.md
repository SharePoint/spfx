# @spfx-template/copilot-component-noframework

## Summary

Short summary on functionality and used technologies.

[picture of the solution in action, if possible]

## Used SharePoint Framework Version

[![version](https://img.shields.io/badge/version-1.24.1-green.svg)](https://img.shields.io/badge/version-1.24.1-green.svg)

## Applies to

- [SharePoint Framework](https://aka.ms/spfx)
- [Microsoft 365 Copilot](https://learn.microsoft.com/copilot/microsoft-365/)

> Get your own free development tenant by subscribing to [Microsoft 365 developer program](http://aka.ms/o365devprogram)

## Prerequisites

Connector exposure requires compatible SPFx build tooling and SharePoint deployment support.
The published SPFx 1.24.1 tooling does not yet implement the exposure setting or
root connector placeholder validation/binding. Do not deploy this scaffold until that support
is released and verified for the target host. The source manifest is not a deployable app package.

## Solution

| Solution    | Author(s)                                               |
| ----------- | ------------------------------------------------------- |
| folder name | Author details (name, company, twitter alias with link) |

## Version history

| Version | Date             | Comments        |
| ------- | ---------------- | --------------- |
| 1.0     | January 1, 2025  | Initial release |

## Disclaimer

**THIS CODE IS PROVIDED _AS IS_ WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**

---

## Minimal Path to Awesome

- Clone this repository
- Ensure that you are at the solution folder
- in the command-line run:
  - `npm install -g @rushstack/heft`
  - `npm install`
  - `heft start`

> Include any additional steps as needed.

Other build commands can be listed using `heft --help`.

## Features

This Copilot Component renders a greeting card when invoked by Microsoft 365 Copilot.

- Demonstrates the `BaseCopilotComponent` base class
- Uses Zod for properties schema (single source of truth for TypeScript types and JSON Schema)
- Includes a declarative agent manifest for Microsoft 365 Copilot
- Includes a tenant-neutral root MCP connector declaration alongside the declarative agent

## Copilot exposure and discovery

New solutions explicitly select both capabilities in `config/package-solution.json`:

```json
"copilotComponentExposure": ["Connector", "Agent"]
```

This solution-level setting accepts a nonempty array of unique, case-sensitive `Connector`
and/or `Agent` values. Use `["Connector"]` or `["Agent"]` for a single capability.
Existing solutions that omit the setting retain Agent-only behavior; re-scaffolding or adding
a component preserves that omission and any explicit selection. Scaffolding is not an SDK
upgrade and does not replace existing authored Copilot JSON.

Discovery is independent of exposure. `config/copilot-agent.json` uses dynamic discovery by
default when `agents[].toolDiscovery` is omitted. To retain static discovery, set that existing
property to `"static"`; there is no additional CLI flag.

The build tooling generates the selected graph from component/tool metadata. Dynamic discovery
does not need a generated catalog. Static Agent-only retains inline tools; static Connector-only
uses `mcp-tools.json`; static both shares that one file between the root connector and API plugin.
Do not duplicate runtime schemas or add a dangling catalog reference to the source manifest.
Keep the existing one-agent group even for Connector-only; it supplies build metadata.

The Teams app manifest retains version `1.29`. `{{TENANT_MCP_URL}}` is a deployment placeholder
for the existing solution-scoped MCP endpoint, not a public URL. Compatible tooling must validate
the staged graph and bind the endpoint/authentication during deployment. The source
`authorization.type` of `None` does not bypass SharePoint authorization or consent.

## Optional manual skills

Add ordinary, non-hidden files under `copilot/skills/<name>/`, including `SKILL.md` and any
supporting files. Declare the folder relative to the final app ZIP in `copilot/manifest.json`:

```json
"agentSkills": [
  { "folder": "skills/my-skill" }
]
```

For this declaration, the source must include `copilot/skills/my-skill/SKILL.md`. Nested support
files are carried by the existing recursive staging/ZIP flow. Skills are optional and independent
of all three exposure modes; no skill or declaration is generated automatically. Root
`agentSkills` is not declarative-agent `agent_skills` registration.

Keep referenced folders inside `copilot`; unrelated folders and Markdown links are not copied.
Hidden content is excluded by the existing build flow. Compatible tooling must check that the
declared folder, required `SKILL.md` and support files survive final staging/macro cleanup, obey
target-host limits and exist at their exact ZIP-relative paths. Skill bytes are assets, not build
instructions to execute.

Package through the existing single tenant-neutral `teams` ZIP inside `.sppkg`, deploy the
SharePoint solution, then sync/publish the app through the supported catalog route. Changes to
packaged skills, connector declarations or static catalogs require app update/republication;
runtime-discovered tool changes do not necessarily require a new baseline sync. Catalog listing
does not prove user acquisition, connection, consent or invocation/rendering.

## References

- [Getting started with SharePoint Framework](https://docs.microsoft.com/sharepoint/dev/spfx/set-up-your-developer-tenant)
- [Microsoft 365 Copilot extensibility](https://learn.microsoft.com/copilot/microsoft-365/extensibility/)
- [Heft Documentation](https://heft.rushstack.io/)
