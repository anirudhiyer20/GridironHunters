# Decision 004: Medieval Pixel World Shell

## Status

Accepted

## Decision

GridironHunters will shift from a futuristic arcade-console visual language to a medieval pixel-arcade shell.

The player-facing app will be framed by four core spaces:

- House
- Guild
- Dungeon
- Arena

Important product-language rules:

- League -> Guild
- Commissioner -> Guild Master
- House = the player identity within a Guild
- Party = the House roster
- Type -> Tribe
- Badge -> Sigil
- Draft stays Draft
- Draft Room stays Draft Room

The MVP shell uses:

- click-to-move avatar navigation
- single-player/local presentation only
- no NPCs
- no visible other players in rooms
- no open overworld

## Why

The project’s mechanics are already more game-like than standard fantasy football. The previous visual direction made the app feel like a dashboard with themed panels, but not like a place. The medieval shell gives the product a stronger identity, improves room for onboarding and future progression features, and creates a clearer fantasy frame for Hunts, Arena play, and House/Guild ownership.

## Consequences

- Shared terminology must be centralized and reused across UI and docs
- Major surfaces should be re-entered through House / Guild / Dungeon / Arena rather than generic app hubs
- Existing web workflows should be preserved behind the shell during MVP rather than fully rebuilt as spatial RPG systems
- Future custom art, avatar customization, and world expansion now have a stable conceptual home
