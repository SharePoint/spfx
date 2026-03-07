# Setting Up Your Dev Environment

## Node.js

This repository requires **Node.js >=22.14.0 <23.0.0** (specified in `rush.json`).

We recommend [**nvs**](https://github.com/jasongin/nvs) (Node Version Switcher) to manage Node.js versions:

```bash
# Install the required version
nvs add 22

# Switch to it
nvs use 22
```

Any Node.js version manager (nvm, fnm, volta, etc.) works — just make sure the active version satisfies `>=22.14.0 <23.0.0`.

## Rush

This monorepo uses [Rush](https://rushjs.io/) to manage builds, dependencies, and project orchestration.

Install Rush globally:

```bash
npm install -g @microsoft/rush
```

## First-Time Setup

After cloning the repo:

```bash
rush install
rush build
```

`rush install` installs all dependencies using the checked-in lockfile. Use `rush update` only when you are intentionally adding or changing dependencies.

## Editor

No specific editor is required. If you use VS Code, the repo includes workspace settings that work out of the box.
