# Architecture

## Technical Direction

Chosen direction:

- Next.js application
- Supabase-backed Postgres
- Supabase auth
- Scheduled jobs for weekly operations and data refresh
- Redis or queue layer is optional at first and added only when needed

The strategy is to stay lean, move quickly with Supabase migrations, and now wrap the product in a medieval pixel-arcade shell that gives the user a strong sense of place without turning the MVP into a full RPG engine.

## Stack

- Frontend: Next.js web app
- Backend: Next.js server capabilities plus Supabase-backed data layer
- Database: Postgres managed through Supabase
- Auth: Supabase auth with email and password
- Hosting: cost-efficient setup appropriate for a closed beta of about 100 users, with a path to scale later

## Repository Structure

- `apps/web`: main web application, UI, route handlers, world-shell scenes, and app-specific server logic
- `packages/shared`: portable shared domain types, terminology, constants, helpers, and eventually game logic interfaces
- `docs`: durable project context, decisions, setup notes, and task records
- `supabase`: migrations, seeds, and Supabase configuration

## Core Domain Model

Primary entities expected in the system:

- users
- platform admins
- guilds (internally still leagues in some tables/routes during transition)
- guild memberships
- invite codes
- seasons
- weeks
- houses
- parties / rosters
- bots
- rostered players
- drops and pending drop effects
- NFL players
- player tribe assignments
- mythic tags
- drafts
- draft picks
- draft queues and rankings
- weekly lineups
- hunt submissions
- wild pool entries
- arena schedules
- arena matchup results
- playoff rounds and matchup results
- sigils
- notifications
- audit logs
- scoring snapshots and corrections
- provider sync runs

## World Shell Model

The player-facing app now uses a hub-and-room presentation layer:

- **House**: player home base and identity shell
- **Guild**: Draft, membership, invite, and communal season systems
- **Dungeon**: Wild Player and Hunt entry space, including 8 Tribe doors
- **Arena**: PvP, standings, and results

Architectural rules for the shell:

- click-to-move only in MVP
- single-player/local avatar state only
- no NPC system in MVP
- no visible multiplayer state in rooms in MVP
- rooms act as route-aware shells and navigation layers over existing workflows

## Key Domain Rules To Preserve

- Player ownership is unique within a Guild.
- Weekly finalization is deterministic at Tuesday 8:00 AM ET.
- Official NFL kickoff is the lock source of truth.
- A frozen stats snapshot should drive weekly outcomes at finalization.
- Post-finalization changes require admin approval and auditability.
- Playoff Week 2 cannot reuse players started in Week 1 of the same round.
- House identity and Party roster language must stay distinct in player-facing UI.

## Application Boundaries

`apps/web` should own:

- authentication flows
- House / Guild / Dungeon / Arena scene presentation
- avatar movement and hotspot interactions
- guild creation and join UX
- Draft Room experience
- lineup management
- Hunt targeting UX
- Arena and playoff matchup views
- admin and Guild Master screens
- notification surfaces

`packages/shared` should own:

- product terminology and world-shell constants
- game constants such as tribe maps, advantage chain, and lineup slots
- scoring and battle formulas
- playoff and standings calculation helpers
- validation rules that should be portable across UI, jobs, and server logic
- provider-facing domain interfaces

Database and job layer should own:

- durable state
- guild and roster integrity
- weekly rollover operations
- score ingestion persistence
- finalization snapshots
- audit logging
- scheduled automation such as bot fill, score refresh, and week advancement

## UI And Navigation Architecture

Expected frontend layers:

- shared world-shell components for room framing and medieval pixel styling
- reusable room-scene model with hotspot definitions
- local avatar movement state and room transitions
- feature pages that can be entered from room objects/doors
- route mapping from House to Guild / Dungeon / Arena without introducing a full overworld

The first implementation pass should favor:

- object-driven discovery
- readable overlays over long instructional text
- preserving current route boundaries while changing how users enter them

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
- bot fill for guilds one hour before Draft
- periodic score refresh during live games

## Auth And Access Model

- Human users authenticate with email and password
- Email verification is required for humans
- Bots bypass email verification
- Admin manual reset and self-serve password reset both exist
- Roles include user, Guild Master, and platform admin
- Guild Master powers are guild-scoped
- Platform admins have global controls and impersonation capability

## Deployment Notes

The MVP should optimize for simplicity, low cost, and operational clarity over premature scale work. The architecture should support a small closed beta first, with clean enough boundaries to later introduce dedicated workers, queueing, caching, more robust ingestion infrastructure, and eventually a richer overworld or multiplayer presentation layer.

Simulation tooling is planned for Phase 2 as an admin-only capability, not as a day-one MVP requirement.

## Open Technical Questions

- Confirm exact normalized team-name constants for the Tribe map, especially around historical naming inconsistencies
- Define explicit zero-state behavior for impossible or unfilled playoff Week 2 slots when roster depth is insufficient
- Decide where the deterministic weekly finalization snapshot is computed and persisted for the cleanest auditability
- Decide how House identity should eventually be stored durably if player customization expands beyond UI framing
