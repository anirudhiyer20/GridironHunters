# Architecture Direction

## Decision

Use Next.js with Supabase-backed Postgres and scheduled jobs as the MVP architecture.

Build with provider abstractions so ESPN-based ingestion can be replaced later. Keep Redis or a queue layer optional until usage or complexity justifies it.

## Why

This approach is fast to build, cost-efficient for a small beta, and supports reproducible schema changes through migrations.

## Consequences

- Domain logic should not be tightly coupled to one data provider
- Scheduled operations become a first-class part of the system design
- We should avoid premature infrastructure complexity while still preserving clean boundaries
