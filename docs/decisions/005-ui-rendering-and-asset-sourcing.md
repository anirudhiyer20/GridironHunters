# 005 — UI Rendering and Asset Sourcing

## Status
Accepted (Pilot for Guild Center)

## Context
Hand-built CSS geometry is proving brittle for character/prop visuals and is slowing UI polish.

We need:
- better visual quality
- lightweight runtime impact
- fully free/open-source libraries
- a traceable legal trail for external assets

## Decision
Use a hybrid UI strategy:

1. **NES.css** for selected UI controls/panels only.
2. **PixiJS** for room-scene rendering (sprite layers, character display, visual props).
3. Keep existing React + Next route structure and business logic unchanged.

## Why this stack
- **NES.css** (MIT, CSS-only) is lightweight and quick for retro controls.
- **PixiJS** (open source) is purpose-built for performant 2D sprite rendering.
- Together, they avoid the "all-box CSS art" problem while keeping app architecture stable.

## Non-goals (pilot)
- No full game-engine migration.
- No replacement of all existing pages at once.
- No paid or closed-source UI/runtime dependencies.

## Guardrails
- Use one visual language per surface:
  - Scene rendering = PixiJS
  - Form/control UI = NES.css tokens/components + project theme overrides
- Avoid mixing multiple retro UI frameworks on the same screen.
- Every external asset must be logged in `docs/asset-source-ledger.md` before merge.

## Consequences
- Initial setup work for a room-scene adapter.
- Better long-term consistency and fewer CSS regressions.
- Clearer licensing posture for future publishing.
