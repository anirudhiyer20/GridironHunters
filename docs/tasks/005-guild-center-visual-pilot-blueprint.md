# 005 — Guild Center Visual Pilot Blueprint

## Goal
Upgrade `/app/guild/ledger` from CSS-constructed art to a stable sprite-driven experience without changing existing Guild Center functionality.

## Pilot Scope
Page: `apps/web/src/app/app/guild/ledger/*`

In scope:
- Landing scene visual overhaul (tavern background, human wizard sprite, menu placement)
- Speech bubble and close interaction polish
- Rulebook frame/edge polish
- Keep Guild Rules / Game Rules / Exit / Resign flows exactly functional

Out of scope:
- Arena/Dungeon/House migration
- gameplay logic changes
- networking/data model changes

## Technical Shape

### 1) Introduce a scene layer adapter
Create a small room renderer wrapper for Guild Center:
- `apps/web/src/components/pixel-scene/`
  - `guild-center-scene.tsx`
  - `sprite.tsx` (safe wrapper for positioning/scaling)
  - `index.ts`

Responsibilities:
- render background and prop sprites
- render wizard sprite (idle pose for pilot)
- expose anchor points for React UI overlays (buttons, bubble, dialogs)

### 2) Keep overlays in React DOM
Existing interactive controls stay in DOM for accessibility and form behavior:
- top action buttons
- close button
- role speech bubble
- rulebook/exit/resign panels

### 3) Use NES.css selectively
Apply NES.css classes only to:
- button shell treatment
- panel borders where it improves consistency

Do not force full-page NES.css reset/theme.

### 4) Asset folder layout (pilot)
Under web public assets:
- `apps/web/public/assets/pixel/guild-center/backgrounds/`
- `apps/web/public/assets/pixel/guild-center/props/`
- `apps/web/public/assets/pixel/guild-center/characters/`
- `apps/web/public/assets/pixel/ui/`

Naming:
- `gc-bg-main-v1.png`
- `gc-prop-counter-v1.png`
- `gc-wizard-idle-front-v1.png`

## Implementation Phases

### Phase A — Foundation
- add NES.css dependency
- add PixiJS dependency
- create `PixelScene` adapter and mount in Guild Center page
- no visual changes yet

### Phase B — Visual port
- move wizard from CSS shape to sprite
- move tavern layers to sprite assets
- keep current button logic unchanged

### Phase C — Polish
- speech bubble tail and placement
- pixel-book edge styling and page flip arrows
- mobile breakpoints and scale clamps

### Phase D — Validation
- `npm --prefix apps/web run build`
- quick visual checks at:
  - 1366x768
  - 1920x1080
  - 390x844

## Acceptance Criteria
- Wizard clearly reads as a human pixel character at standard zoom.
- Landing no longer appears as flat red + box primitives.
- Panels/buttons remain fully functional.
- No CSS selector conflicts that alter sprite rendering.
- Build passes.

## Risk Controls
- Keep pilot behind existing route only (`/app/guild/ledger`).
- Do not remove existing logic until replacement is verified.
- Use explicit scoped class names for Guild Center surface.

## Rollback Plan
- Keep old `GuildCenterClient` styles in a separate block/file during pilot.
- If regressions appear, switch back to old renderer via feature flag constant:
  - `const USE_PIXEL_GUILD_CENTER = false`.

## Tomorrow’s First Task List
1. Add dependencies: `nes.css`, `pixi.js`.
2. Scaffold `pixel-scene` components and asset folders.
3. Move wizard to first sprite asset and verify render.
4. Wire scene behind current Guild Center controls.
