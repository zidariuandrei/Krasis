# Role-Offset Field Design

## Goal

Make every 3×3 neighborhood on the Krasis color field a usable web-app palette (deep primary, near-white, cream, shadow, secondary, success, warning, danger, etc.), while keeping cell colors stable and role labels assigned dynamically from LCH.

Today the field only drifts hue slowly across X and lightness by ±16 in a 3-row cycle, so neighborhoods stay a tight blue family and are not cohesive UI kits.

## Decisions

- **Approach:** Anchored 3×3 tile recipes + regional drift (option A).
- **Cell stability:** Color is a pure function of `(x, y)` only. Hover/selection never recolors the field.
- **Role assignment:** Dynamic by LCH (keep current model; extend role vocabulary).
- **Out of scope:** Seed color picker UI, export, contrast checker, grid size changes, hash jitter, dual-axis continuum.

## Field generation

Replace the current `fieldAt` path (small lightness steps, tiny chroma modulation, narrow `hueStops`).

### Tile recipes

Every cell maps to a recipe via modular position:

```text
tileX = ((x % 3) + 3) % 3
tileY = ((y % 3) + 3) % 3
```

A fixed 3×3 table of LCH **offsets** (relative to a regional base) defines nine UI-oriented types. Illustrative layout (exact numbers tuned in implementation so L spans ~8–96 and accents stay in-gamut):

| tileY \ tileX | 0 | 1 | 2 |
|---------------|---|---|---|
| **0** | light cool (near-white / cool bg) | primary mid | cream / warm light |
| **1** | secondary / muted support | deep primary | shadow (dark, low-mid chroma) |
| **2** | success (green band) | warning (yellow–orange) | danger (red) |

Each recipe specifies at least:

- `lOffset` / absolute target lightness band
- `cOffset` or absolute chroma (near-0 for bg/cream/shadow; higher for primary and semantic accents)
- `hMode`: `base` (follow regional hue), or fixed semantic hue centers (success ~145°, warning ~75°, danger ~25°) with small regional drift so kits are not identical across the atlas

Any axis-aligned 3×3 window contains each recipe type exactly once when the window is tile-aligned, and still contains a full spread of types when shifted by one cell (the set of nine colors remains a complete kit; composition just rotates which type sits at center).

### Regional base

```text
blockX = floor(x / 3)
blockY = floor(y / 3)
```

Derive from `seedLch` (existing seed hex → LCH):

- **Base hue:** `seedLch.h + blockX * hueStep + blockY * hueStepY` (wrap 0–360). Suggested steps ~20–35° so neighboring regions feel related but distinct.
- **Base lightness:** modest drift with `blockY` (and optional weaker `blockX`) so north/south kits are not clones; keep primary-capable cells in a usable mid band after recipe offsets.
- **Base chroma:** slight regional variation optional; recipes own most chroma structure.

### Continuity and clamping

- Adjacent cells that share a recipe type differ only through regional base drift (smooth enough at block boundaries).
- Different recipe types stay intentionally far apart in LCH — that is the desired “noise” / usable variation.
- Clamp L to roughly `[4, 96]`, C to a safe max for the hue (or a global cap ~4–90 as today), H via existing `wrapHue`.
- Keep existing RGB ↔ LCH helpers and `cellInk` luminance logic.

### Unchanged field chrome

- Grid radii, expand-on-scroll, center selection, inspector layout stay as they are unless recipe tuning requires no UI change.

## Palette roles (dynamic)

Keep selection of the 3×3 around `activeCenter`. Center cell remains **primary** for the active palette.

Extend `PaletteRole` beyond the current set:

```text
background | light | support | primary | dark | shadow | accent | success | warning | danger
```

Assignment rules (deterministic, pure from the nine cells):

1. **primary** — center cell (`cells[4]`).
2. **success / warning / danger** — among non-primary cells, prefer high chroma in green / yellow–orange / red hue bands (one cell each when present; if missing, leave role unassigned and fall through).
3. **accent** — among remaining candidates, highest score of chroma + hue distance from primary (same spirit as today).
4. **background, light, support, dark, shadow** — remaining cells sorted by lightness (lightest → background/light, darkest → dark/shadow), matching current ordering intent; use distinct labels without forcing two cells to share `light` when better labels fit.

Inspector continues to render the nine cells with role label + hex.

## Data flow

```text
seedHex → seedLch
(x,y) → tile recipe + regional base → LCH → hex/ink → field cell
hover (x,y) → 3×3 fieldAt samples → dynamic role map → activePalette
```

No new server routes or shared modules required for this change; logic stays in `app/app.vue` unless extraction is trivial and already patterned.

## Error handling

None beyond existing clamps. Out-of-gamut LCH → RGB already projects via channel clamp in `lchToHex`; tune recipes so primaries and semantics stay recognizable after projection.

## Verification

1. Visual: sliding the active center by one cell yields a different but still complete UI-like kit (not nine near-identical blues).
2. Stability: same `(x,y)` always same hex before/after hover elsewhere.
3. Roles: center labeled primary; semantic hues get success/warning/danger when those recipe cells are in the window; bg/shadow land on lightest/darkest extremes.
4. Existing dev/build path still typechecks (`pnpm` / Nuxt tooling as in project README).

## Implementation notes

- Single primary touchpoint: `fieldAt`, `hueStops` / related helpers, `PaletteRole` + `activePalette` scoring.
- Remove or stop using narrow `hueStops` interpolation if recipes + regional base fully own hue.
- Prefer a readable `TILE_RECIPES: LchRecipe[][]` (or flat map keyed by `tileY * 3 + tileX`) over magic numbers inline.
- Do not commit unrelated dirty working-tree assets when landing this feature.
