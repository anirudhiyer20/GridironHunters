# Roadmap

## Current Phase

The project is in a build phase with a parallel product-shell overhaul. Core Draft foundations already exist, and implementation now needs to carry both the gameplay systems and the medieval world-shell presentation forward together.

## Delivery Approach

- Use Supabase migrations as the source of truth for schema evolution
- Avoid ad hoc database edits as durable implementation
- Build MVP first for a small closed beta
- Keep provider and domain logic portable so scaling later is straightforward
- Build the House / Guild / Dungeon / Arena shell as the player-facing frame for the app

## Sprint 1

Goal:

Foundations, auth, guilds, roles, and world-shell foundation

Definition of done:

- Email and password auth works with verification
- User, Guild Master, and platform admin roles are modeled
- Guild creation and joining flow works with reusable invite codes
- Pre-Draft membership rules are enforced
- One-guild-at-a-time restriction works for general users
- Admin multi-guild support exists for testing
- Core audit logging and impersonation foundations are in place
- House / Guild / Dungeon / Arena shell is established

## Sprint 2

Goal:

Draft

Definition of done:

- Snake Draft supports random order and 1-minute timer
- Autopick works for timeouts and disconnects
- Queue and pre-rank are supported
- Draft pause and resume are available to Guild Master and admin
- Draft constraints are enforced
- Draft completion results in valid initial Parties and starting lineup options
- Draft Room is restyled into the medieval shell

## Sprint 3

Goal:

Hunts and weekly jobs

Definition of done:

- Wild pool and mythic weekly reveal system exists
- Hunt submissions and validation rules work
- Tribe and Sigil bonuses are computed correctly
- Weekly scheduled jobs support score refresh and Tuesday finalization
- Provider delay handling and admin re-sync controls exist
- Drop timing and wild-pool return timing behave correctly
- Dungeon shell hosts tribe-based Hunt entry

## Sprint 4

Goal:

Arena season, playoffs, and admin tooling

Definition of done:

- Weeks 5 to 13 Arena schedule and standings work
- Playoff qualification, seeding, and tiebreakers work
- Two-week playoff round restrictions are enforced
- Admin tools support score correction approval, force-advance, mythic override, and audit review
- Guild tooling supports pre-Draft controls and Draft operations
- Arena shell hosts matchup, standings, and results views cleanly

## Milestone View

## Milestone 1

Playable House and Guild onboarding with functional access control and Draft entry

## Milestone 2

Complete Draft-to-Hunt weekly loop inside the new shell

## Milestone 3

Full season path from Draft through playoffs with cohesive world presentation

## Immediate Next Steps

- Finish terminology replacement in player-facing UI where the fantasy shell is now the source of truth
- Expand House interactions beyond shell framing into Party, avatar, and activity interactions
- Move more Draft and guild surfaces behind the Guild shell
- Build the Dungeon tribe-door flows into real Hunt workflows
- Bring Arena standings and matchup screens into the new presentation language

## Known Risks

- Unofficial ESPN endpoints may be unstable or change shape
- Weekly finalization and corrections require careful auditability
- Guild-local ownership integrity must hold across Draft, Hunts, drops, and playoffs
- Playoff reuse restrictions can create tricky edge cases if roster depth is insufficient
- The visual shell can become expensive if room art and gameplay are coupled too tightly too early
