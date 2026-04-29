# Sprite Collaboration Playbook (ELI5)

This guide is for teams where one person codes and another person designs sprites.

## 1) ELI5: What we are doing

Think of the app like a stage:
- **PixiJS** is the stage engine (it places and scales art).
- **NES.css** is costume/makeup for buttons and UI panels.
- **Sprites** are the actual actors and props (wizard, wardrobe, mailbox, doors).

Right now, some actors are built from code rectangles.  
That is fast for prototypes, but not good for final visual quality.

So we will:
1. Design real sprite images.
2. Put them in the repo.
3. Let PixiJS render those images.
4. Keep buttons/forms in NES.css + existing React UI.

## 2) What you need (free/open tools)

Use any one of these for pixel art work:
- **LibreSprite** (free/open-source desktop)
- **Piskel** (free browser tool)
- **Krita** (free/open-source desktop, good if configured for pixel mode)

Use this for visual QA:
- browser at 100% zoom
- screen captures for review

Use this for license/legal tracking:
- `docs/asset-source-ledger.md`

## 3) Required infrastructure (project setup)

### Folder structure
Store final assets here:
- `apps/web/public/assets/pixel/guild-center/backgrounds/`
- `apps/web/public/assets/pixel/guild-center/props/`
- `apps/web/public/assets/pixel/guild-center/characters/`
- `apps/web/public/assets/pixel/shared/ui/`

Store working source files here:
- `apps/web/public/assets/pixel-src/guild-center/`

`pixel-src` holds editable source files (`.aseprite`, `.kra`, `.piskel`, etc).  
Final app consumes exported `.png` in `assets/pixel/...`.

### Naming rules
Use predictable names:
- `<scene>-<category>-<asset>-v<version>.png`

Examples:
- `gc-character-wizard-idle-front-v1.png`
- `gc-prop-wardrobe-front-v1.png`
- `gc-prop-mailbox-front-v1.png`
- `gc-bg-main-hall-v1.png`

### Technical rules (must follow)
- PNG format with transparent background when needed.
- No anti-aliasing (hard pixel edges only).
- Keep a fixed base grid (default: 32x32 tiles).
- Use nearest-neighbor scaling only.
- Keep light direction consistent (top-left recommended).

## 4) Roles and handoff model

### Designer (non-coder)
- Creates or redraws sprites.
- Exports final PNG files.
- Provides 1 preview sheet + optional notes.
- Records source/license details.

### Coder
- Imports sprites to repo folders.
- Wires sprites into Pixi scene config.
- Defines clickable hitboxes.
- Handles layering, scaling, and interaction logic.

## 5) Daily workflow (simple)

1. **Pick batch**
   - Example batch: wizard, wardrobe, mailbox.

2. **Prepare art brief**
   - Scene: Guild Center
   - Asset IDs
   - Target size
   - Reference image links
   - Animation need (yes/no)

3. **Design + export**
   - Designer creates sprite(s) and exports PNG.

4. **License log**
   - Fill row(s) in `docs/asset-source-ledger.md` before merge.

5. **Import + wire**
   - Coder adds files to `apps/web/public/assets/pixel/...`.
   - Coder updates Pixi scene to use sprite path(s).

6. **QA**
   - Desktop + mobile snapshot checks.
   - Validate no blur, no wrong layering, no clipping.

## 6) Sprite acceptance checklist (definition of done)

An asset is done when all are true:
- Matches visual brief and reference direction.
- Clear silhouette at normal gameplay zoom.
- No blurry edges.
- Correct folder + naming.
- Source/license entry added to ledger.
- Works in scene without overlapping important UI.

## 7) First production batch (recommended)

Start with Guild Center:
1. `gc-character-wizard-idle-front-v1.png`
2. `gc-prop-bar-counter-v1.png`
3. `gc-prop-back-shelves-v1.png`
4. `gc-prop-stool-v1.png`
5. `gc-prop-plant-v1.png`

Then House:
1. `house-prop-wardrobe-front-v1.png`
2. `house-prop-mailbox-front-v1.png`
3. `house-prop-party-chest-front-v1.png`

## 8) Handoff package template (designer -> coder)

For each asset, include:
- Asset ID
- Final PNG path/name
- Source working file path/name
- Intended on-screen size (example: 3 tiles wide x 4 tiles tall)
- Anchor point (example: bottom-center)
- Any animation frames? (yes/no)
- License/source details

## 9) Common mistakes to avoid

- Mixing different art styles in one scene.
- Exporting anti-aliased images (blurry when scaled).
- Skipping license/source tracking.
- Using random file names.
- Merging sprite before testing layering with UI overlays.

## 10) Next step for this project

For tomorrow:
1. Finalize wizard sprite as real PNG asset.
2. Replace code-rectangle wizard in Guild Center with sprite texture.
3. Repeat for wardrobe + mailbox props.
4. Keep interactions in React/NES.css, visuals in Pixi sprites.
