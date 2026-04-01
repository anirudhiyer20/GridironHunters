# Setup Checklist

This file is the source of truth for getting the project ready before any app code is written.

If this is a fresh machine after a Windows reinstall, start with [`docs/machine-setup.md`](machine-setup.md).

## 1. Confirm the GitHub Home

Target repository:

- GitHub owner: `anirudhiyer20`
- Recommended repo name: `GridironHunters`

Why this matters:

- your local folder should point to one GitHub repo, not several
- every branch, PR, and task will live under the same project home

### If the repo does not exist yet

Create it on GitHub with:

- repository name: `GridironHunters`
- visibility: your choice
- do not initialize with extra files if you want to connect this exact folder cleanly

### If the repo already exists

Later, once Git is installed locally, verify the remote with:

```powershell
git remote -v
```

You want to see a remote URL that points to `anirudhiyer20/GridironHunters`.

## 2. Confirm Git Is Installed Locally

In this workspace, `git` is not currently available in the terminal session.

Check in a fresh terminal:

```powershell
git --version
```

If that fails, install one of these:

- Git for Windows
- GitHub Desktop

After install, reopen VS Code and run:

```powershell
git --version
git init
```

## 3. Keep the Local Folder Clean

Recommended top-level structure:

```text
GridironHunters/
  docs/
    decisions/
    tasks/
  apps/
    web/
  packages/
    shared/
  supabase/
    migrations/
    seed.sql
```

Notes:

- `docs/` holds setup notes, decisions, and task history
- `apps/web/` will hold the frontend later
- `packages/shared/` is for shared code only if we need it
- `supabase/` is where local database schema and SQL history should live

## 4. Set Up Supabase the Safe Way

Recommended order:

1. Create the Supabase project in the Supabase dashboard
2. Save the project URL and anon key somewhere secure
3. Install the Supabase CLI locally
4. Link this repository to that Supabase project
5. Keep secrets in `.env.local`, not in committed files

When tools are installed, these are the typical commands:

```powershell
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

After `supabase init`, this repo should contain a `supabase/` folder.

## 5. Verify Before Building

Do these checks before writing app code:

- `git --version` works
- `git remote -v` points to the right GitHub repo
- the repo opens in VS Code from the correct folder
- Supabase project exists
- local `supabase/` folder exists
- secrets are stored in `.env.local`

## 6. First Files To Add Later

Once Git and Supabase are confirmed, the next good setup files are:

- `.gitignore`
- `.env.example`
- `apps/web/`
- `supabase/config.toml`

Do not commit real secrets.
