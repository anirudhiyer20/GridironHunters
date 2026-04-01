# GridironHunters

This repository is the home base for the GridironHunters project.

Fantasy Football Game.

Before development starts, use the docs in [`docs/`](docs/) to:

- connect the project to the correct GitHub repository
- set up and link Supabase
- keep database changes migration-driven
- keep project decisions in one place
- organize work by task so future chats stay easy to follow

## Suggested Setup Order

1. Read [`docs/setup-checklist.md`](docs/setup-checklist.md)
2. Confirm the GitHub repository and local Git install
3. Create the Supabase project
4. Read [`docs/database-workflow.md`](docs/database-workflow.md)
5. Record decisions in [`docs/decisions/`](docs/decisions/)
6. Track active work in [`docs/tasks/`](docs/tasks/)

## Working Style

Keep one task per chat when possible, and record the outcome of that chat in a task note under `docs/tasks/`.

## Structure

```text
GridironHunters/
  apps/
    web/
  packages/
    shared/
  docs/
    decisions/
    tasks/
    database-workflow.md
  supabase/
    migrations/
    seed.sql
```
