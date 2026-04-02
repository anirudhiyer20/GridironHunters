# Roadmap

## Current Phase

The project is in plan-to-build transition. Core product rules are defined, and implementation should now proceed in four sprints with migrations-first database work.

## Delivery Approach

- Use Supabase migrations as the source of truth for schema evolution
- Avoid ad hoc database edits as durable implementation
- Build MVP first for a small closed beta
- Keep provider and domain logic portable so scaling later is straightforward

## Sprint 1

Goal:

Foundations, auth, leagues, and roles

Definition of done:

- Email and password auth works with verification
- User, commissioner, and platform admin roles are modeled
- League creation and joining flow works with reusable invite codes
- Pre-draft membership rules are enforced
- One-league-at-a-time restriction works for general users
- Admin multi-league support exists for testing
- Core audit logging and impersonation foundations are in place

## Sprint 2

Goal:

Draft

Definition of done:

- Snake draft supports random order and 1-minute timer
- Autopick works for timeouts and disconnects
- Queue and pre-rank are supported
- Draft pause and resume are available to commissioner and admin
- Draft constraints are enforced
- Draft completion results in valid initial rosters and starting lineup options

## Sprint 3

Goal:

Capture and weekly jobs

Definition of done:

- Wild pool and mythic weekly reveal system exists
- Capture submissions and validation rules work
- Type and badge bonuses are computed correctly
- Weekly scheduled jobs support score refresh and Tuesday finalization
- Provider delay handling and admin re-sync controls exist
- Drop timing and wild-pool return timing behave correctly

## Sprint 4

Goal:

Gauntlet, playoffs, and admin tooling

Definition of done:

- Weeks 5 to 13 gauntlet schedule and standings work
- Playoff qualification, seeding, and tiebreakers work
- Two-week playoff round restrictions are enforced
- Admin tools support score correction approval, force-advance, mythic override, and audit review
- Commissioner tooling supports pre-draft league controls and draft operations

## Milestone View

## Milestone 1

Playable pre-draft league setup and access control

## Milestone 2

Complete draft-to-capture weekly loop

## Milestone 3

Full season path from draft through playoffs

## Immediate Next Steps

- Translate the product rules into concrete schema coverage and validate current migrations against MVP needs
- Define shared domain constants for lineup slots, types, advantage chain, roles, and weekly phase timing
- Implement or refine auth and league membership flows around the confirmed access rules
- Document deterministic weekly job responsibilities before adding more gameplay logic

## Known Risks

- Unofficial ESPN endpoints may be unstable or change shape
- Weekly finalization and corrections require careful auditability
- League-local ownership integrity must hold across draft, capture, drops, and playoffs
- Playoff reuse restrictions can create tricky edge cases if roster depth is insufficient
