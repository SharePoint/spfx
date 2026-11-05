# Contributing to SPFx CLI

Thank you for your interest in contributing to the SPFx CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details, or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Contributor License Agreement (CLA)

Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions provided by the bot. You will only need to do this once across all repos using our CLA.

## Reporting Issues

- Use [GitHub Issues](https://github.com/SharePoint/spfx/issues) to report bugs and request features.
- Search existing issues before filing a new one to avoid duplicates.
- When reporting a bug, include steps to reproduce, expected behavior, and actual behavior.

## How to Contribute

1. **Fork** the repository and clone your fork locally.
2. Create a **branch** for your change (`git checkout -b <feature-name>`).
   - Use branch names in the form `<feature-name>` (for example, `add-logging`).
3. Make your changes and verify the build passes (see [Development](#development)).
4. **Commit** your changes with a clear, descriptive message.
5. **Push** to your fork and open a Pull Request against `main`.

Please keep PRs focused — one logical change per PR. Ensure your fork is up to date with `main` before submitting.

## Development

- [Setting up your dev environment](common/docs/setting-up-your-dev-environment.md) — Node.js, Rush, first-time setup
- [Building and testing](common/docs/building-and-testing.md) — build commands, snapshot testing, change logs
- [Creating a new template](common/docs/creating-a-new-template.md) — template workflow, variables, registration
- [Branching and release strategy](common/docs/branching-and-release-strategy.md) — branch naming, version mapping, hotfix workflow
