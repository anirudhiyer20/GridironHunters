# Product Spec

## Vision

Gridiron Hunters is a fantasy-football and creature-collection hybrid where players belong to Houses inside Guilds, draft weaker Parties, then capture stronger Wild Players through weekly battles.

The product should feel strategic, competitive, and readable while also delivering a strong medieval pixel-arcade fantasy. The user should move through a House, Guild, Dungeon, and Arena shell that gives the season a sense of place rather than feeling like a stack of disconnected dashboards.

## Problem

Traditional fantasy football is familiar, but it offers limited novelty once a league is underway. Gridiron Hunters adds progression, collection, battle systems, and now a stronger navigable fantasy shell while preserving the weekly rhythm and tension fantasy players already understand.

## Target Users

- Fantasy football players who want a more game-like seasonal format
- Competitive users comfortable with weekly lineup decisions and matchup optimization
- Closed-beta testers invited through reusable codes during MVP

## Release Context

- Closed beta
- Web app first
- iOS later
- Invite-only via reusable codes
- In-app notifications only

## Core Experience

The user joins a 10-team Guild, establishes a House, drafts an initial Party, then improves that Party through weekly Hunts against Wild Players. The season progresses through structured phases: Draft, capture, Arena PvP, and playoffs.

Users should understand why they won or lost. Matchups and capture battles must clearly show fantasy points, Tribe advantage effects, and Sigil bonuses.

## World Shell

The MVP presentation layer uses a hub-and-room structure:

- **House**: the player’s home base and identity shell
- **Guild**: Guild management, membership, Draft access, and shared seasonal info
- **Dungeon**: Wild Player and Hunt entry point, including 8 Tribe doors
- **Arena**: PvP matchups, standings, and results

Rules for the first shell:

- Navigation is click-to-move
- The shell is local/single-player only
- No visible other players in rooms during MVP
- No NPCs during MVP
- No open overworld during MVP

## Terminology

Player-facing language should shift to the fantasy shell where practical:

- League -> Guild
- Commissioner -> Guild Master
- League member -> Guildmate
- House = the player’s identity within a Guild
- Party = the House roster
- Type -> Tribe
- Badge -> Sigil
- PvP -> Arena framing
- Draft stays Draft for clarity
- Draft Room stays Draft Room for clarity

## MVP Scope

All of the following are still in MVP:

- Account and auth
- Guilds
- Draft
- Hunts / capture battles
- Arena PvP
- Playoffs
- Bots
- Admin tools
- Medieval world shell

## User And Guild Rules

- Guild size is fixed at 10 Houses in MVP.
- Anyone can found a Guild.
- General users can participate in one Guild at a time.
- Platform admins can join multiple Guilds for testing and backtesting.
- Guilds lock on a Guild Master-selected draft datetime.
- Bots fill open slots 1 hour before Draft if a Guild is not full.
- Humans have priority until the bot-fill threshold.
- No joining after the Draft starts.
- No leaving mid-season.
- Before the Draft, users may leave and Guild Masters may remove users.

## Invite Codes

- Reusable
- Human-friendly format
- Show "guild full" when capacity is reached
- Become usable again if a pre-Draft spot opens
- Expire at Draft start

## Auth, Identity, And Roles

- Auth method is email and password only.
- Email verification is required for human users.
- Bots do not require email or verification.
- Password reset supports both self-serve email reset and admin manual reset.

Roles:

- User
- Guild Master
- Platform Admin

Platform admins may impersonate users for support and debugging during closed beta.

## Season Model

- Users see one global active live season at a time.
- Before live launch, testing and backtesting may use historical seasons.
- Admins retain access to historical seasons even when a live season is active.
- Canonical weekly rollover and finalization time is Tuesday at 8:00 AM ET.

## NFL Data And Scoring Expectations

- MVP data source is ESPN unofficial public endpoints.
- Data ingestion must be built behind a provider abstraction so the source can be replaced later.
- Live score refresh starts at hourly cadence.
- Official NFL kickoff is the source of truth for lock timing.
- Kickoff should display in the user's timezone, but locking always follows the real kickoff.
- Injury status should appear in the UI.

If data provider updates are delayed:

- Freeze last known scores
- Show a "data delayed" message
- Provide an admin "re-sync now" control

Stat corrections finalize at Tuesday 8:00 AM ET. Any change after finalization requires admin approval.

## Player Ownership And Party Rules

- Player ownership is unique within a Guild, not across the platform.
- MVP has no waivers or free agency.
- Acquisition paths are Draft plus capture only.
- Users may drop players voluntarily.
- Drops become effective at the next Tuesday 8:00 AM ET rollover.
- Dropped players re-enter the wild pool for the following lock window, not immediately.
- There is no roster cap in MVP outside explicit Draft rules.

## Tribes, Advantages, And Sigils

Tribe groups:

- Combat: Chiefs, Raiders, Commanders, Titans
- Forge: Steelers, Colts, 49ers, Jets
- Storm: Falcons, Seahawks, Eagles, Cardinals
- Tundra: Packers, Vikings, Bills, Patriots
- Halo: Cowboys, Rams, Saints, Chargers
- Blaze: Browns, Broncos, Dolphins, Giants
- Shroud: Ravens, Texans, Buccaneers, Panthers
- Prowl: Bengals, Bears, Jaguars, Lions

Advantage chain:

- Combat > Shroud > Halo > Tundra > Blaze > Storm > Forge > Prowl > Combat

Rules:

- Non-mythic Tribe advantage bonus is +10%.
- Mythic Tribe advantage bonus is +20%.
- There is no disadvantage penalty.
- Sigil bonus is +5% when a Party has 4 or more players of a matching Tribe.
- Sigils stack across Tribes at team level, but a player only benefits from that player's own Tribe Sigil.
- The Tribe chart is visible before lock.
- Ties are allowed and recorded.

Final score formula:

`final_score = fantasy_points * (1 + type_bonus + badge_bonus)`

## Draft

- Snake Draft
- Random Draft order
- 1 minute per pick
- Timeout triggers autopick
- Pre-rank and queue are supported
- Draft supports pause and resume by Guild Master or admin
- Disconnects fall back to autopick when the timer expires

Draft constraints:

- Exactly 8 picks
- Minimum 1 QB, 1 RB, 1 WR, 1 TE
- Maximum 2 QBs
- Starting lineup is QB, RB, WR, TE, FLEX, FLEX
- FLEX supports RB, WR, or TE
- Draft pool and top wild exclusions are set by admins at season start
- Traded draft picks are out of scope for MVP

## Hunts / Capture Phase

Capture runs during Weeks 1 through 4.

Rules:

- 3 battle keys per week
- Unused keys carry over
- No maximum key bank
- Keys reset to 0 entering playoffs

Wild battle rules:

- Each key targets one Wild Player with one challenger
- Multiple keys may target the same Wild Player
- The same challenger cannot be reused for multiple keys in the same week
- Challenger and target must be valid relative to game lock timing
- Users may edit submissions until lock
- If challenger is ruled out, the battle still stands
- If target is ruled out before game start, the battle is voided and keys are refunded
- If nobody outscores the target, the target remains unclaimed

## Mythics

- The wild tier contains about 15 mythic players
- Each week, 2 to 5 mythics appear at Tuesday 8:00 AM ET
- Weekly mythic selection is uniform random
- Mythics on bye or marked injured are excluded
- The same mythic may appear in consecutive weeks if selected
- Admins may override weekly mythic reveals

## Arena Phase

Arena runs during Weeks 5 through 13 as a 9-week round robin schedule generated at season start.

Each weekly matchup has 7 outcomes:

- QB slot battle
- RB slot battle
- WR slot battle
- TE slot battle
- FLEX slot battle
- FLEX slot battle
- Total lineup points

Standings:

- Track W-L-T
- Ties count as 0.5 wins in ranking math
- Display record, total points, and win percentage

Capture continues in Weeks 5 through 13 with modified rules:

- +1 key per week
- Keys still carry over
- Only non-starters may challenge Wild Players
- Any player used as a challenger cannot start that same week
- The player remains on the roster afterward

## Playoffs

Playoffs run during Weeks 14 through 17.

- Top 4 teams qualify
- Semifinals are 1 vs 4 and 2 vs 3
- Finals and 3rd place match both run
- Weeks 14 to 15 are round 1
- Weeks 16 to 17 are finals and third-place round
- No wild battles occur during playoffs

Two-week playoff round rules:

- Week 1 behaves like normal lineup lock
- Any player started in Week 1 cannot be used again in Week 2 of the same round
- Invalid Week 2 reuse is blocked on save with a warning
- The deciding result includes a 13th outcome based on combined total points across both weeks to avoid ties

Confirmed seeding and tiebreak order:

- Win-equivalent where ties count as 0.5
- Total points
- Largest single-week point total

## Auto-Management

Auto-management activates after 2 missed lineup locks.

While active:

- The system optimizes the lineup
- The system does not spend battle keys

The user regains control through an explicit toggle prompt after returning.

## UX Priorities

Most polished MVP screens:

- Draft Room
- Wild Player target lobby / Hunt chamber
- Weekly Arena matchup screen with transparent scoring breakdown
- House shell and navigation surfaces

Tutorial expectations:

- Click-through slides
- Images and text bubbles
- Shown at account creation
- Optional to revisit later
- Completion stored per user
- If the user is mistakenly routed after completion, redirect to the main page

Notifications:

- In-app only
- Lock reminders at 24 hours if incomplete
- Lock reminders at 1 hour always
- Results notifications at Tuesday 8:00 AM ET finalization
- Activity feed includes weekly results and capture acquisitions

## Guild Master And Admin Capabilities

Guild Master abilities:

- Edit Guild settings before Draft
- Remove Guildmates before Draft
- Pause and resume Draft
- View Guild-relevant audit events
- Compete as a House owner within the same Guild

Platform admin abilities:

- All Guild Master abilities
- Set Draft pools
- Set mythic tags
- Override weekly mythic reveals
- Force-advance the week
- Make manual score edits with required reason and audit trail
- Trigger re-sync
- Approve or deny post-finalization corrections
- View full audit logs
- Use impersonation support

## Legal And Risk Posture

- The product is not licensed
- MVP should avoid NFL logos by default
- Prefer names and stats only to reduce risk
- Signup should include a disclaimer that data may be delayed or corrected
- Signup should also disclose that outcomes may update until Tuesday 8:00 AM ET
- Geographic focus is the United States first, without strict geo or IP enforcement in MVP

## Non-Goals

- Native iOS app in MVP
- Traded draft picks in MVP
- Waivers or free agency in MVP
- Real-time push notifications outside the app in MVP
- Licensed NFL branding in MVP
- Overworld traversal in MVP
- NPC-driven room interactions in MVP
- Visible multiplayer movement in MVP

## Success Criteria

- Closed-beta users can complete a full season loop from Guild join through playoffs
- Weekly outcomes are deterministic and understandable after Tuesday finalization
- Guild-local player uniqueness remains intact across Draft, Hunts, and playoffs
- Admins can operate the season safely when provider data is delayed or corrected
- The House / Guild / Dungeon / Arena shell makes the product feel cohesive rather than dashboard-fragmented
