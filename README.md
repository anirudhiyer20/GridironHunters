# GridironHunters

GridironHunters is a fantasy-football and creature-collection game with a medieval pixel-arcade presentation.

Each player belongs to a **House** within a **Guild**, manages a roster called a **Party**, drafts an opening roster, then improves that Party through Hunts, Arena competition, and seasonal progression.

## Start Here

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first.

Then use the docs in [`docs/`](docs/) to understand:

- the product vision and MVP rules
- the medieval world-shell direction
- the migrations-first database workflow
- the terminology and architecture decisions already locked in
- how to collaborate safely across GitHub and Supabase

## Current Product Direction

The app is moving into a hub-and-room experience:

- **House**: player home base and identity shell
- **Guild**: guild management, Draft access, membership, and shared seasonal structure
- **Dungeon**: tribe-based Wild Player discovery and Hunt entry
- **Arena**: PvP, standings, and results

The first shell pass keeps the app web-first and route-driven while wrapping those workflows in a walkable, click-to-move fantasy presentation.

## Suggested Setup Order

1. Read [`docs/setup-checklist.md`](docs/setup-checklist.md)
2. Confirm the GitHub repository and local Git install
3. Create or link the Supabase project
4. Read [`docs/database-workflow.md`](docs/database-workflow.md)
5. Read [`docs/team-access.md`](docs/team-access.md)
6. Record decisions in [`docs/decisions/`](docs/decisions/)
7. Track meaningful work in [`docs/tasks/`](docs/tasks/)

## Working Style

- Keep durable backend changes migration-driven.
- Keep one major task per chat when possible.
- Use feature branches for collaboration.
- Treat docs as source of truth when major product decisions change.

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
