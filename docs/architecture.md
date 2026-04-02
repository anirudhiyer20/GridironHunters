# Architecture

## Technical Direction

Chosen direction:

- Next.js application
- Supabase-backed Postgres
- Supabase auth
- Scheduled jobs for weekly operations and data refresh
- Redis or queue layer is optional at first and added only when needed

The strategy is to start lean and move quickly with Supabase migrations and clear provider abstractions, while keeping domain logic portable enough to scale out later.

## Stack

- Frontend: Next.js web app
- Backend: Next.js server capabilities plus Supabase-backed data layer
- Database: Postgres managed through Supabase
- Auth: Supabase auth with email and password
- Hosting: cost-efficient setup appropriate for a closed beta of about 100 users, with a path to scale later

## Repository Structure

- `apps/web`: main web application, UI, route handlers, and app-specific server logic
- `packages/shared`: portable shared domain types, constants, helpers, and eventually game logic interfaces
- `docs`: durable project context, decisions, setup notes, and task records
- `supabase`: migrations, seeds, and Supabase configuration

## Core Domain Model

Primary entities expected in the system:

- users
- platform admins
- leagues
- league memberships
- invite codes
- seasons
- weeks
- teams
- bots
- rosters
- rostered players
- drops and pending drop effects
- NFL players
- player type assignments
- mythic tags
- drafts
- draft picks
- draft queues and rankings
- weekly lineups
- capture submissions
- wild pool entries
- gauntlet schedules
- gauntlet matchup results
- playoff rounds and matchup results
- badges
- notifications
- audit logs
- scoring snapshots and corrections
- provider sync runs

## Key Domain Rules To Preserve

- Player ownership is unique within a league.
- Weekly finalization is deterministic at Tuesday 8:00 AM ET.
- Official NFL kickoff is the lock source of truth.
- A frozen stats snapshot should drive weekly outcomes at finalization.
- Post-finalization changes require admin approval and auditability.
- Playoff Week 2 cannot reuse players started in Week 1 of the same round.

## Application Boundaries

`apps/web` should own:

- authentication flows
- league creation and join UX
- draft room experience
- lineup management
- capture targeting UX
- gauntlet and playoff matchup views
- admin and commissioner screens
- notification surfaces

`packages/shared` should own:

- game constants such as type maps, advantage chain, and lineup slots
- scoring and battle formulas
- playoff and standings calculation helpers
- validation rules that should be portable across UI, jobs, and server logic
- provider-facing domain interfaces

Database and job layer should own:

- durable state
- league and roster integrity
- weekly rollover operations
- score ingestion persistence
- finalization snapshots
- audit logging
- scheduled automation such as bot fill, score refresh, and week advancement

## Data Provider Strategy

MVP data source is ESPN unofficial public endpoints.

Implementation guidance:

- Build a provider abstraction from day one
- Keep provider-specific parsing isolated
- Preserve the ability to swap to another source later
- Surface injury status in the app
- On provider failure, freeze last known scores and mark the system as delayed

## Weekly Operations Model

Canonical weekly transition time is Tuesday at 8:00 AM ET.

Expected scheduled operations include:

- weekly score finalization
- dropped-player return to the wild pool
- mythic weekly reveal generation
- bot fill for leagues one hour before draft
- periodic score refresh during live games

## Auth And Access Model

- Human users authenticate with email and password
- Email verification is required for humans
- Bots bypass email verification
- Admin manual reset and self-serve password reset both exist
- Roles include user, commissioner, and platform admin
- Commissioner powers are league-scoped
- Platform admins have global controls and impersonation capability

## Deployment Notes

The MVP should optimize for simplicity, low cost, and operational clarity over premature scale work. The architecture should support a small closed beta first, with clean enough boundaries to later introduce dedicated workers, queueing, caching, or more robust ingestion infrastructure.

Simulation tooling is planned for Phase 2 as an admin-only capability, not as a day-one MVP requirement.

## Open Technical Questions

- Confirm exact normalized team-name constants for the type map, especially around historical naming inconsistencies
- Define explicit zero-state behavior for impossible or unfilled playoff Week 2 slots when roster depth is insufficient
- Decide where the deterministic weekly finalization snapshot is computed and persisted for the cleanest auditability
