# Database Workflow

This project uses Supabase, but GitHub is the source of truth for database structure.

## Team Rule

Do not treat the Supabase dashboard as the primary place to define schema.

Instead:

- create schema changes as migration files under `supabase/migrations/`
- commit those files to GitHub
- review them in pull requests
- apply them through the Supabase CLI

## Why This Matters

This keeps the database reproducible.

Benefits:

- new collaborators can pull the repo and understand the schema history
- Codex users and manual coders follow the same workflow
- schema changes are reviewable
- we avoid needing a brand-new Supabase project just to recover a clean migration history

## Preferred Workflow

1. Pull latest changes from GitHub
2. Create a new migration:

```powershell
npx supabase migration new describe_change_here
```

3. Edit the generated SQL file in `supabase/migrations/`
4. Review the SQL before applying it
5. Apply migrations to the linked project:

```powershell
npx supabase db push
```

6. Commit the migration file with the related code changes

## Avoid This Unless Necessary

- creating tables directly in the dashboard first
- changing policies directly in the dashboard without adding matching SQL to the repo
- sharing one person's local undocumented database state with the team

Dashboard edits are okay for exploration, but if something becomes real, it should be captured in a migration promptly.

## Local Environment Files

Each contributor should keep their own `.env.local`.

The repo should only contain:

- `.env.example`

The repo should never contain:

- real API keys
- database passwords
- service role or secret keys

## Keys

Safe for frontend usage:

- project URL
- publishable key

Sensitive:

- database password
- secret key
- service role key

Sensitive values must not be committed or pasted into frontend code.
