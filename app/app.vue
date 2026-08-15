<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

useHead({
  title: 'Krasis | Color field',
  link: [
    {
      rel: 'icon',
      href: '/logo.png',
      type: 'image/png'
    },
    {
      rel: 'shortcut icon',
      href: '/favicon.ico',
      type: 'image/x-icon'
    }
  ],
  meta: [
    {
      name: 'description',
      content: 'Explore reusable palettes derived through shared LCH color relationships.'
    }
  ]
})

type Lch = {
  l: number
  c: number
  h: number
}

type FieldCell = Lch & {
  key: string
  x: number
  y: number
  hex: string
  ink: string
}

type PaletteRole = 'background' | 'light' | 'support' | 'primary' | 'dark' | 'shadow' | 'accent'

type PaletteCell = FieldCell & {
  role: PaletteRole
}

const seedHex = '#2E63A5'
const fieldColumnRadius = 6
const fieldRowRadius = ref(7)
const fieldRef = ref<HTMLElement | null>(null)
const fieldHover = ref(false)
const isTouch = ref(false)
const isExpanding = ref(false)
const activeCenter = ref({ x: 0, y: 0 })

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrapHue = (value: number) => ((value % 360) + 360) % 360

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '')
  const number = Number.parseInt(value, 16)

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  }
}

const toLinearRgb = (value: number) => {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

const fromLinearRgb = (value: number) => {
  const normalized = value <= 0.0031308
    ? value * 12.92
    : 1.055 * (Math.max(value, 0) ** (1 / 2.4)) - 0.055

  return clamp(normalized, 0, 1)
}

const labPivot = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116

const labInverse = (value: number) => {
  const cube = value ** 3
  return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787
}

const rgbToLch = (hex: string): Lch => {
  const rgb = hexToRgb(hex)
  const red = toLinearRgb(rgb.r)
  const green = toLinearRgb(rgb.g)
  const blue = toLinearRgb(rgb.b)
  const x = (red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047
  const y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175
  const z = (red * 0.0193339 + green * 0.119192 + blue * 0.9503041) / 1.08883
  const fx = labPivot(x)
  const fy = labPivot(y)
  const fz = labPivot(z)
  const a = 500 * (fx - fy)
  const b = 200 * (fy - fz)

  return {
    l: 116 * fy - 16,
    c: Math.sqrt(a ** 2 + b ** 2),
    h: wrapHue(Math.atan2(b, a) * 180 / Math.PI)
  }
}

const lchToHex = ({ l, c, h }: Lch) => {
  const angle = h * Math.PI / 180
  const a = c * Math.cos(angle)
  const b = c * Math.sin(angle)
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const x = labInverse(fx) * 0.95047
  const y = labInverse(fy)
  const z = labInverse(fz) * 1.08883
  const red = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  const green = x * -0.969266 + y * 1.8760108 + z * 0.041556
  const blue = x * 0.0556434 + y * -0.2040259 + z * 1.0572252
  const channels = [red, green, blue].map((channel) => Math.round(fromLinearRgb(channel) * 255))

  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  return toLinearRgb(r) * 0.2126 + toLinearRgb(g) * 0.7152 + toLinearRgb(b) * 0.0722
}

const cellInk = (hex: string) => relativeLuminance(hex) > 0.48 ? '#0E2C53' : '#F7F8F6'
const seedLch = rgbToLch(seedHex)

type TileRecipe = {
  lOffset: number
  c?: number
  hue: 'base' | number
  hueOffset?: number
}

// Six palette recipe types (offsets relative to the regional base), arranged
// in a 3×2 repeating tile. No semantic accents — every cell is a usable
// neutral/primary/support tone.
const RECIPES: TileRecipe[] = [
  { lOffset: 50, c: 6, hue: 'base' },                       // 0 light-cool
  { lOffset: 6, c: 38, hue: 'base' },                      // 1 primary-mid
  { lOffset: 42, c: 11, hue: 'base', hueOffset: 15 },      // 2 cream
  { lOffset: 18, c: 20, hue: 'base', hueOffset: 20 },      // 3 secondary
  { lOffset: -12, c: 32, hue: 'base' },                    // 4 deep-primary
  { lOffset: -26, c: 12, hue: 'base' }                     // 5 shadow
]

const blockHueStepX = 28
const blockHueStepY = 22
const blockLightnessStepX = 1.5
const blockLightnessStepY = 3

// Deterministic per-3×2-block variation (mulberry32). The six recipes are
// shuffled per block so the field never repeats a rigid motif.
const blockVariation = (blockX: number, blockY: number) => {
  let state = (blockX * 374761393 + blockY * 668265263) | 0
  const next = () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const order = [0, 1, 2, 3, 4, 5]
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1))
    ;[order[index], order[swap]] = [order[swap]!, order[index]!]
  }
  const jitters = Array.from({ length: 6 }, () => next() * 2 - 1)
  const chromaDelta = next() * 26 - 18

  return { order, jitters, chromaDelta }
}

const fieldAt = (x: number, y: number): FieldCell => {
  const blockX = Math.floor(x / 3)
  const blockY = Math.floor(y / 2)
  const { order, jitters, chromaDelta } = blockVariation(blockX, blockY)
  const tileX = ((x % 3) + 3) % 3
  const tileY = ((y % 2) + 2) % 2
  const recipeIndex = order[tileY * 3 + tileX]!
  const recipe = RECIPES[recipeIndex]!
  const jitter = jitters[recipeIndex]!
  const hueDrift = blockX * blockHueStepX + blockY * blockHueStepY
  const baseHue = wrapHue(seedLch.h + hueDrift)
  const baseLightness = clamp(seedLch.l + blockY * blockLightnessStepY + blockX * blockLightnessStepX, 38, 58)
  const l = clamp(baseLightness + recipe.lOffset, 4, 96)
  // Near-white background tints are desaturated by a lightness envelope so they
  // read as neutral washes; the other tones keep their regional chroma.
  const baseC = recipe.c ?? seedLch.c
  const isBackgroundTint = recipe.lOffset >= 40
  const envelope = isBackgroundTint ? Math.sin(Math.PI * clamp((l - 4) / 92, 0, 1)) : 1
  const lch = {
    l,
    c: isBackgroundTint
      ? clamp(baseC * envelope, 4, 90)
      : clamp(baseC + chromaDelta + jitter * 5, 4, 90),
    h: wrapHue(baseHue + (recipe.hueOffset ?? 0))
  }
  const hex = lchToHex(lch)

  return {
    ...lch,
    key: `${x}:${y}`,
    x,
    y,
    hex,
    ink: cellInk(hex)
  }
}

const fieldCells = computed(() => {
  const cells: FieldCell[] = []

  for (let y = -fieldRowRadius.value; y <= fieldRowRadius.value; y += 1) {
    for (let x = -fieldColumnRadius; x <= fieldColumnRadius; x += 1) {
      cells.push(fieldAt(x, y))
    }
  }

  return cells
})

const hueDistance = (first: number, second: number) => Math.abs(((first - second + 180) % 360) - 180)

const neutralRole = (index: number, total: number): PaletteRole => {
  if (index === 0) return 'background'
  if (index === total - 1) return 'shadow'
  if (index === total - 2) return 'dark'
  return index <= total / 2 - 1 ? 'light' : 'support'
}

// The active palette is the 3×2 window centered on the hovered cell, so the
// highlight tracks the cursor: hovering column n lights up columns n-1, n, n+1.
const activeBlock = computed(() => {
  const cx = activeCenter.value.x
  const cy = activeCenter.value.y
  const x0 = Math.max(-fieldColumnRadius, Math.min(cx - 1, fieldColumnRadius - 2))
  const y0 = Math.max(-fieldRowRadius.value, Math.min(cy - 1, fieldRowRadius.value - 1))
  return { x0, y0 }
})

const selectionStyle = computed(() => {
  const cols = fieldColumnRadius * 2 + 1
  const rows = fieldRowRadius.value * 2 + 1
  const { x0, y0 } = activeBlock.value
  return {
    left: `${((x0 + fieldColumnRadius) / cols) * 100}%`,
    top: `${((y0 + fieldRowRadius.value) / rows) * 100}%`,
    width: `${(3 / cols) * 100}%`,
    height: `${(2 / rows) * 100}%`
  }
})

const activePalette = computed<PaletteCell[]>(() => {
  const { x0: blockX0, y0: blockY0 } = activeBlock.value
  const cells: FieldCell[] = []

  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      cells.push(fieldAt(blockX0 + column, blockY0 + row))
    }
  }

  const primaryKey = `${activeCenter.value.x}:${activeCenter.value.y}`
  const primary = cells.find((cell) => cell.key === primaryKey) ?? cells[0]!
  const candidates = cells.filter((cell) => cell.key !== primary.key)
  const roleByCell = new Map<string, PaletteRole>([[primary.key, 'primary']])

  const accent = candidates.reduce((best, cell) => {
    const score = cell.c + hueDistance(cell.h, primary.h) * 0.35
    const bestScore = best.c + hueDistance(best.h, primary.h) * 0.35
    return score > bestScore ? cell : best
  })
  roleByCell.set(accent.key, 'accent')

  const neutrals = candidates
    .filter((cell) => cell.key !== accent.key)
    .sort((first, second) => second.l - first.l)

  neutrals.forEach((cell, index) => {
    roleByCell.set(cell.key, neutralRole(index, neutrals.length))
  })

  return cells.map((cell) => ({ ...cell, role: roleByCell.get(cell.key) ?? 'support' }))
})

const activePrimary = computed(() => activePalette.value.find((cell) => cell.key === `${activeCenter.value.x}:${activeCenter.value.y}`) ?? activePalette.value[0]!)
const fieldStyle = computed(() => ({ '--field-columns': fieldColumnRadius * 2 + 1 }))
const formatPosition = (value: number) => value > 0 ? `+${value}` : `${value}`

const selectCenter = (cell: FieldCell) => {
  activeCenter.value = { x: cell.x, y: cell.y }
}

const onTouchField = () => {
  isTouch.value = true
  fieldHover.value = true
}

const onLeaveField = () => {
  if (!isTouch.value) fieldHover.value = false
}

const centerField = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    const element = fieldRef.value
    if (!element) return
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2
  })
}

const expandField = async (event: Event) => {
  const element = event.currentTarget as HTMLElement
  if (isExpanding.value) return

  const edge = 180
  const nearEdge = element.scrollTop < edge
    || element.scrollTop + element.clientHeight > element.scrollHeight - edge

  if (!nearEdge) return

  isExpanding.value = true
  const previousHeight = element.scrollHeight
  const previousTop = element.scrollTop
  fieldRowRadius.value += 4
  await nextTick()
  element.scrollTop = previousTop + (element.scrollHeight - previousHeight) / 2
  isExpanding.value = false
}

onMounted(centerField)
</script>

<template>
  <div class="site-shell atlas-page">
    <NuxtRouteAnnouncer />

    <header class="site-header">
      <a class="wordmark" href="/" aria-label="Krasis home">
        <img class="wordmark-logo" src="/logo.png" alt="" aria-hidden="true">
        <span class="wordmark-copy">
          <strong>KRASIS</strong>
          <small>COLOR STUDIES</small>
        </span>
      </a>

      <div class="header-center">
        <span class="eyebrow">CHROMA / LCH FIELD</span>
        <strong>COLOR ATLAS</strong>
      </div>

      <div class="header-meta">
        <span>OVERLAPPING WINDOWS</span>
        <span class="status-dot" aria-hidden="true"></span>
        <span>LIVE</span>
      </div>
    </header>

    <main class="atlas-main">
      <section class="atlas-intro" aria-labelledby="atlas-title">
        <div>
          <p class="eyebrow">ΚΡΑΣΙΣ / THE MIXING</p>
          <h1 id="atlas-title">Color, in <em>neighborhoods.</em></h1>
        </div>

        <aside class="palette-inspector" :class="{ 'is-linked': fieldHover }" aria-live="polite" aria-label="Selected palette">
          <div class="inspector-heading">
            <span>PALETTE / {{ formatPosition(activeCenter.x) }}, {{ formatPosition(activeCenter.y) }}</span>
            <strong>{{ activePrimary.hex }}</strong>
          </div>
          <div class="inspector-grid">
            <div
              v-for="cell in activePalette"
              :key="`${cell.role}-${cell.key}`"
              class="inspector-cell"
              :style="{ backgroundColor: cell.hex, color: cell.ink }"
            >
              <span>{{ cell.role }}</span>
              <strong>{{ cell.hex }}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section id="atlas" class="atlas-stage" aria-label="Overlapping LCH palette field">
        <div class="stage-topline">
          <span>{{ fieldCells.length }} CELLS / 3 × 2 COLOR BLOCKS</span>
          <span>VERTICAL SCROLL TO EXPAND</span>
        </div>

          <div ref="fieldRef" class="field-viewport" @scroll="expandField" @mouseenter="fieldHover = true" @mouseleave="onLeaveField" @touchstart="onTouchField">
          <div class="field-grid" :style="fieldStyle">
            <button
              v-for="cell in fieldCells"
              :key="cell.key"
              type="button"
              class="field-cell"
              :style="{ backgroundColor: cell.hex }"
              :aria-label="`Use ${cell.hex} as the primary color at ${formatPosition(cell.x)}, ${formatPosition(cell.y)}`"
              @mouseenter="selectCenter(cell)"
              @focus="selectCenter(cell)"
              @click="selectCenter(cell)"
            ></button>
            <div class="field-selection" :style="selectionStyle" aria-hidden="true"></div>
          </div>
        </div>

        <div class="stage-bottomline">
          <span>Y / LIGHTNESS + TEMPERATURE</span>
          <span>3 × 2 COLOR BLOCKS</span>
          <span>X / HUE + CHROMA</span>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span>SHARED CELL FIELD</span>
      <span>CENTER CELL = PRIMARY</span>
      <span>KRASIS / 2026</span>
    </footer>
  </div>
</template>

<style>
:root {
  --paper: #f7f8f6;
  --ink: #0e2c53;
  --muted: #56708b;
  --blue: #1557a6;
  --line: rgba(14, 44, 83, 0.24);
  --serif: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  --sans: 'Avenir Next', 'Helvetica Neue', Helvetica, sans-serif;
  --mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}

button,
a {
  font: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  border: 0;
}

::selection {
  background: var(--blue);
  color: #fff;
}

.site-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-image:
    linear-gradient(to right, rgba(14, 44, 83, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(14, 44, 83, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
}

.site-header,
.atlas-main,
.site-footer {
  width: min(1500px, calc(100% - 48px));
  margin-inline: auto;
}

.site-header {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  min-height: 78px;
  padding-top: 18px;
}

.wordmark {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 10px;
}

.wordmark-logo {
  display: block;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  object-fit: contain;
}

.wordmark-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
}

.wordmark-copy strong {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
}

.wordmark-copy small,
.eyebrow,
.header-meta,
.header-center,
.stage-topline,
.stage-bottomline,
.inspector-heading,
.inspector-cell,
.site-footer {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wordmark-copy small {
  color: var(--muted);
  font-size: 0.5rem;
  letter-spacing: 0.15em;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
}

.header-center strong {
  color: var(--ink);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
}

.eyebrow {
  margin: 0;
  color: var(--blue);
}

.header-meta {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
  color: var(--muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--blue);
  box-shadow: 0 0 0 4px rgba(21, 87, 166, 0.12);
}

.atlas-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: clamp(24px, 4vw, 56px);
}

.atlas-intro {
  flex: 0 0 auto;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 38px;
  padding-bottom: 24px;
}

h1 {
  margin: 10px 0 0;
  font-family: var(--serif);
  font-size: clamp(3.4rem, 7vw, 7.8rem);
  font-weight: 400;
  letter-spacing: -0.08em;
  line-height: 0.82;
}

h1 em {
  color: var(--blue);
  font-style: italic;
  letter-spacing: -0.1em;
}

.palette-inspector {
  width: min(390px, 100%);
  flex: 0 0 min(390px, 100%);
}

.palette-inspector.is-linked .inspector-grid {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
  border-radius: 7px;
}

.inspector-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 8px;
  color: var(--muted);
}

.inspector-heading strong {
  color: var(--ink);
  font-size: 0.75rem;
}

.inspector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  aspect-ratio: 3 / 2;
  border-radius: 5px;
  overflow: hidden;
  background: #e6e9ee;
  box-shadow: 0 1px 4px rgba(14, 44, 83, 0.16);
  transition: box-shadow 0.15s ease, outline-color 0.15s ease;
}

.inspector-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  overflow: hidden;
  font-size: 0.5rem;
}

.inspector-cell strong {
  font-size: 0.55rem;
  letter-spacing: 0.04em;
}

.atlas-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: 12px 12px 0 rgba(216, 231, 243, 0.9);
}

.stage-topline,
.stage-bottomline {
  position: absolute;
  z-index: 3;
  right: 18px;
  left: 18px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: var(--ink);
  font-size: 0.74rem;
  pointer-events: none;
}

.stage-topline span,
.stage-bottomline span {
  background: rgba(247, 248, 246, 0.88);
  padding: 3px 7px;
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(14, 44, 83, 0.12);
}

.stage-topline {
  top: 13px;
}

.stage-bottomline {
  bottom: 13px;
}

.field-viewport {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-x: none;
  touch-action: pan-y;
  scrollbar-color: var(--blue) var(--paper);
  scrollbar-width: thin;
}

.field-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--field-columns), minmax(0, 1fr));
  grid-auto-rows: auto;
  width: 100%;
  height: max-content;
  margin: 36px 0;
}

.field-cell {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 3px;
  cursor: crosshair;
  transition: box-shadow 0.15s ease, outline-color 0.15s ease;
}

.field-selection {
  position: absolute;
  z-index: 2;
  border-radius: 7px;
  pointer-events: none;
  box-shadow:
    0 0 0 2px rgba(14, 44, 83, 0.9),
    0 0 0 4px rgba(247, 248, 246, 0.95),
    0 12px 26px rgba(14, 44, 83, 0.32);
  transition:
    left 0.12s ease,
    top 0.12s ease,
    width 0.12s ease,
    height 0.12s ease,
    box-shadow 0.15s ease;
}

.site-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 32px;
  color: var(--muted);
}

@media (max-width: 1024px) {
  .site-header {
    grid-template-columns: 1fr auto;
    min-height: 70px;
    padding-top: 14px;
  }

  .header-center {
    display: none;
  }

  .header-meta {
    grid-column: 2;
    grid-row: 1;
  }

  .atlas-main {
    padding-top: clamp(20px, 3vw, 40px);
  }

  .atlas-intro {
    gap: 24px;
    padding-bottom: 16px;
  }

  h1 {
    font-size: clamp(2.6rem, 5.4vw, 5rem);
  }

  .palette-inspector {
    width: min(320px, 100%);
    flex-basis: min(320px, 100%);
  }

  .stage-topline,
  .stage-bottomline {
    font-size: 0.52rem;
  }
}

@media (max-width: 640px) {
  .site-header,
  .atlas-main,
  .site-footer {
    width: min(100% - 28px, 1500px);
  }

  .wordmark-logo {
    width: 34px;
    height: 34px;
  }

  .header-meta {
    font-size: 0.56rem;
  }

  .atlas-intro {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 14px;
  }

  .atlas-intro > div {
    flex: 1 1 56%;
    min-width: 0;
  }

  h1 {
    font-size: clamp(1.9rem, 7vw, 2.8rem);
  }

  .palette-inspector {
    flex: 0 0 44%;
    width: auto;
    margin-top: 0;
  }

  .inspector-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
    aspect-ratio: 4 / 3;
  }

  .stage-topline,
  .stage-bottomline {
    right: 12px;
    left: 12px;
    gap: 8px;
    font-size: 0.48rem;
  }

  .inspector-cell {
    padding: 4px;
    font-size: 0.42rem;
  }

  .inspector-cell strong {
    font-size: 0.48rem;
  }

  .site-footer {
    flex-wrap: wrap;
    gap: 8px 20px;
    padding: 14px 0 18px;
    font-size: 0.52rem;
  }

  .site-footer span:nth-child(2) {
    order: 3;
    flex-basis: 100%;
  }
}

@media (max-width: 400px) {
  h1 {
    font-size: 1.9rem;
  }

  .palette-inspector {
    flex-basis: 40%;
  }

  .stage-topline span:last-child,
  .stage-bottomline span:first-child {
    display: none;
  }

  .inspector-cell {
    padding: 5px;
    font-size: 0.43rem;
  }

  .inspector-cell strong {
    font-size: 0.44rem;
  }
}
</style>
