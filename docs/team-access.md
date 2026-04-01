# Team Access

This project is designed so contributors can work safely even if they do not all have direct access to the hosted Supabase project.

## Core Principle

Writing a migration file is not the same as applying it to the shared hosted database.

That separation is intentional.

## Recommended Roles

### Contributors

Contributors can:

- write application code
- create or edit migration files
- open pull requests
- review schema changes in GitHub

Contributors do not need:

- your personal Supabase login
- your database password
- your secret key

### Maintainers

Maintainers are the small set of trusted people who can:

- log into Supabase with their own account
- access the hosted dashboard if needed
- run `npx supabase db push` against the shared project

## Default Workflow

1. A contributor creates a migration file in `supabase/migrations/`
2. The migration is reviewed in GitHub
3. A maintainer pulls the latest code
4. A maintainer runs:

```powershell
npx supabase db push
```

5. The hosted database is updated in a controlled way

## About Supabase Login

In a normal local terminal, `supabase login` usually persists for future CLI commands on that machine.

If a command runs in a different environment, login may be requested again.

That does not mean the repository is misconfigured.

## Safe Sharing Rules

Never share:

- personal Supabase login credentials
- database passwords
- secret keys
- service role keys

Safe to share with trusted app contributors when needed:

- project URL
- publishable key

## When Collaborators Join

When the team is onboarded, decide which collaborators are:

- code contributors only
- maintainers with hosted Supabase access

Only maintainers should routinely apply migrations to the shared hosted project.
