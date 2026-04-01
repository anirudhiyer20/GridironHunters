# Machine Setup

Use this checklist after a Windows reinstall before trying to build the project.

## What Is Missing Right Now

From this workspace terminal:

- `git` is not available
- `node` is not available
- `npm` is not available
- `npx` is not available

That means this machine is not yet ready for normal JavaScript or Git-based development.

## Install Order

Recommended order:

1. Install Git
2. Install Node.js LTS
3. Reopen VS Code
4. Verify the commands work
5. Connect this folder to GitHub
6. Install Supabase CLI later

## 1. Install Git

Install one of these:

- Git for Windows
- GitHub Desktop

After install, reopen VS Code and run:

```powershell
git --version
```

## 2. Install Node.js

Install the current LTS version of Node.js.

Node.js includes:

- `node`
- `npm`
- `npx`

After install, reopen VS Code and run:

```powershell
node -v
npm -v
npx --version
```

## 3. Next.js Does Not Need A Separate Install

You do not need to globally install Next.js first.

Most of the time, we create a Next.js app with:

```powershell
npx create-next-app@latest
```

So the important install is Node.js, not a global Next.js package.

## 4. Recommended Verification

Before app setup, these should all work:

```powershell
git --version
node -v
npm -v
npx --version
```

## 5. After That

Once the machine tools are ready, the next project steps are:

1. connect this folder to `anirudhiyer20/GridironHunters`
2. create the Supabase project
3. run `supabase init`
4. create the app structure
