# Development Workflow

## Decision

Use a migrations-first database workflow and implement the MVP in four sprints:

1. Foundations, auth, leagues, roles
2. Draft
3. Capture and weekly jobs
4. Gauntlet, playoffs, admin tooling

## Why

The game has many interconnected rules, so reproducible schema management and phased delivery reduce the risk of drifting logic or fragile manual setup.

## Consequences

- Database changes should land through Supabase migrations
- Planning docs must stay current as edge cases are clarified
- Each sprint should end with a working slice of the season loop rather than isolated technical work
