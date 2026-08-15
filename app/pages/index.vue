<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
const theme = ref<'light' | 'dark'>('light')

const toggleTheme = (event?: MouseEvent) => {
  const apply = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  const doc = typeof document !== 'undefined' ? document : undefined
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const supportsTransition = !!doc && typeof (doc as unknown as { startViewTransition?: unknown }).startViewTransition === 'function'
  if (!doc || !supportsTransition || reduceMotion) {
    apply()
    return
  }
  const x = event?.clientX ?? window.innerWidth / 2
  const y = event?.clientY ?? window.innerHeight / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const transition = (doc as unknown as { startViewTransition: (cb: () => void | Promise<void>) => { ready: Promise<void> } }).startViewTransition(() => {
    apply()
    return nextTick()
  })
  transition.ready.then(() => {
    doc.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 420,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}

onMounted(() => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('krasis-theme') : null
  if (saved === 'dark' || saved === 'light') {
    theme.value = saved
  } else if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches) {
    theme.value = 'dark'
  }
})

watch(theme, (value) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('krasis-theme', value)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('theme-dark', value === 'dark')
  }
})
const isExpanding = ref(false)
const activeCenter = ref({ x: 0, y: 0 })
const pinned = ref<{ x: number; y: number } | null>(null)
const displayedFavorite = ref<Favorite | null>(null)
const focusCenter = computed(() => pinned.value ?? activeCenter.value)

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

const fieldAt = (x: number, y: number, mode: 'light' | 'dark' = theme.value): FieldCell => {
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
  const dark = mode === 'dark'
  const lightScale = dark ? 0.72 : 1
  const rawBase = seedLch.l + blockY * blockLightnessStepY + blockX * blockLightnessStepX
  const baseLightness = clamp(rawBase * lightScale, dark ? 14 : 38, dark ? 46 : 58)
  const l = clamp(baseLightness + recipe.lOffset * lightScale, 4, dark ? 80 : 96)
  // Near-white background tints are desaturated by a lightness envelope so they
  // read as neutral washes; the other tones keep their regional chroma.
  const baseC = recipe.c ?? seedLch.c
  const isBackgroundTint = recipe.lOffset >= 40
  const envelope = isBackgroundTint ? Math.sin(Math.PI * clamp((l - 4) / 92, 0, 1)) : 1
  const chromaFactor = dark ? 0.85 : 1
  const lch = {
    l,
    c: isBackgroundTint
      ? clamp(baseC * envelope * (dark ? 0.9 : 1), 4, 90)
      : clamp((baseC + chromaDelta + jitter * 5) * chromaFactor, 4, 90),
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

const neutralRole = (index: number, total: number, dark = false): PaletteRole => {
  if (!dark) {
    if (index === 0) return 'background'
    if (index === total - 1) return 'shadow'
    if (index === total - 2) return 'dark'
    return index <= total / 2 - 1 ? 'light' : 'support'
  }
  // Dark theme: flip the lightness mapping so surfaces become dark and
  // the "dark" role becomes light text.
  if (index === total - 1) return 'background'
  if (index === total - 2) return 'light'
  if (index === 0) return 'dark'
  if (index === 1) return 'shadow'
  return 'support'
}

// Dark-theme target for each role, expressed in LCh. We keep the selected
// hue but remap lightness/chroma so the palette reads as a coherent dark UI.
const DARK_TARGETS: Record<PaletteRole, { l: number; cScale: number }> = {
  background: { l: 14, cScale: 0.55 },
  light: { l: 22, cScale: 0.6 },
  shadow: { l: 9, cScale: 0.5 },
  dark: { l: 92, cScale: 0.5 },
  primary: { l: 60, cScale: 1.1 },
  accent: { l: 66, cScale: 1.15 },
  support: { l: 46, cScale: 0.9 },
}

// The active palette is the 3×2 window centered on the hovered cell, so the
// highlight tracks the cursor: hovering column n lights up columns n-1, n, n+1.
const activeBlock = computed(() => {
  const cx = focusCenter.value.x
  const cy = focusCenter.value.y
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

const buildPalette = (blockX0: number, blockY0: number, primaryX: number, primaryY: number, mode: 'light' | 'dark' = theme.value): PaletteCell[] => {
  const cells: FieldCell[] = []

  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      cells.push(fieldAt(blockX0 + column, blockY0 + row, mode))
    }
  }

  const primaryKey = `${primaryX}:${primaryY}`
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
    .sort((first, second) => mode === 'dark' ? first.l - second.l : second.l - first.l)

  neutrals.forEach((cell, index) => {
    roleByCell.set(cell.key, neutralRole(index, neutrals.length, mode === 'dark'))
  })

  return cells.map((cell) => {
    const role = roleByCell.get(cell.key) ?? 'support'
    if (mode !== 'dark') return { ...cell, role }
    const { l, c, h } = rgbToLch(cell.hex)
    const target = DARK_TARGETS[role]
    const nextC = Math.min(c * target.cScale, 38)
    return { ...cell, role, hex: lchToHex({ l: target.l, c: nextC, h }) }
  })
}

const activePalette = computed<PaletteCell[]>(() =>
  buildPalette(activeBlock.value.x0, activeBlock.value.y0, focusCenter.value.x, focusCenter.value.y)
)

// When a saved favorite is selected, the inspector shows its stored cells
// (exactly what the chip displays) without moving or re-highlighting the atlas.
const displayedPalette = computed<PaletteCell[]>(() => {
  const fav = displayedFavorite.value
  if (!fav) return activePalette.value
  return fav.cells.map((cell, index) => ({
    l: 0,
    c: 0,
    h: 0,
    key: `${fav.sig}-${index}`,
    x: 0,
    y: 0,
    hex: cell.hex,
    ink: cellInk(cell.hex),
    role: cell.role
  }))
})

const activePrimary = computed(() => displayedPalette.value.find((cell) => cell.role === 'primary') ?? displayedPalette.value[0]!)
const displayedCoord = computed(() => displayedFavorite.value?.center ?? focusCenter.value)
const fieldStyle = computed(() => ({ '--field-columns': fieldColumnRadius * 2 + 1 }))
const formatPosition = (value: number) => value > 0 ? `+${value}` : `${value}`

const previewBlock = (cx: number, cy: number) => ({
  x0: Math.max(-fieldColumnRadius, Math.min(cx - 1, fieldColumnRadius - 2)),
  y0: Math.max(-fieldRowRadius.value, Math.min(cy - 1, fieldRowRadius.value - 1)),
})

const previewPalettes = computed(() => {
  const cx = displayedCoord.value.x
  const cy = displayedCoord.value.y
  const { x0, y0 } = previewBlock(cx, cy)
  const pack = (mode: 'light' | 'dark') => buildPalette(x0, y0, cx, cy, mode).map((cell) => ({ role: cell.role, hex: cell.hex }))
  return { light: pack('light'), dark: pack('dark') }
})

const advancedTo = computed(() => ({
  path: '/advanced',
  query: { palette: JSON.stringify(previewPalettes.value) },
}))

const srStatus = ref('')

const selectCenter = (cell: FieldCell) => {
  activeCenter.value = { x: cell.x, y: cell.y }
}

const onCellFocus = (cell: FieldCell) => {
  displayedFavorite.value = null
  pinned.value = null
  selectCenter(cell)
  srStatus.value = `Color ${cell.hex} at ${formatPosition(cell.x)}, ${formatPosition(cell.y)}`
}

const focusCell = (x: number, y: number) => {
  const nx = Math.max(-fieldColumnRadius, Math.min(fieldColumnRadius, x))
  const ny = y
  if (Math.abs(ny) > fieldRowRadius.value) fieldRowRadius.value = Math.abs(ny) + 1
  activeCenter.value = { x: nx, y: ny }
  pinned.value = null
  displayedFavorite.value = null
  fieldHover.value = false
  nextTick(() => {
    const cell = fieldCells.value.find((c) => c.x === nx && c.y === ny)
    if (cell) srStatus.value = `Color ${cell.hex} at ${formatPosition(nx)}, ${formatPosition(ny)}`
    const element = typeof document !== 'undefined' ? document.getElementById(`atlas-cell-${nx}-${ny}`) : null
    if (element) (element as HTMLElement).focus()
  })
}

const onGridKeydown = (event: KeyboardEvent) => {
  const { x, y } = activeCenter.value
  let nx = x
  let ny = y
  switch (event.key) {
    case 'ArrowLeft': nx = x - 1; break
    case 'ArrowRight': nx = x + 1; break
    case 'ArrowUp': ny = y - 1; break
    case 'ArrowDown': ny = y + 1; break
    case 'Home': nx = -fieldColumnRadius; break
    case 'End': nx = fieldColumnRadius; break
    default: return
  }
  event.preventDefault()
  focusCell(nx, ny)
}

const pinCenter = (cell: FieldCell) => {
  displayedFavorite.value = null
  const current = pinned.value
  if (current) {
    const inside = Math.abs(cell.x - current.x) <= 1 && Math.abs(cell.y - current.y) <= 1
    if (inside) {
      pinned.value = null
      return
    }
  }
  pinned.value = { x: cell.x, y: cell.y }
}

type FavoriteCell = { role: PaletteRole; hex: string }
type Favorite = { id: number; sig: string; center: { x: number; y: number }; cells: FavoriteCell[] }

const FAVORITES_KEY = 'krasis-favorites'

const loadFavorites = (): Favorite[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? (JSON.parse(raw) as Favorite[]) : []
  } catch {
    return []
  }
}

const favorites = ref<Favorite[]>([])
const savedFlash = ref('')

const activeSig = computed(() => displayedPalette.value.map((cell) => cell.hex).sort().join('|'))
const isFavorited = computed(() => favorites.value.some((favorite) => favorite.sig === activeSig.value))
const isCurrentFavorite = (fav: Favorite) => fav.sig === activeSig.value

const viewFavorite = (fav: Favorite) => {
  displayedFavorite.value = fav
  fieldHover.value = false
}

const removeFavorite = (id: number) => {
  favorites.value = favorites.value.filter((favorite) => favorite.id !== id)
  persistFavorites()
}

const viewportWidth = ref(1280)
const favoriteLimit = computed(() => {
  if (viewportWidth.value <= 640) return 2
  if (viewportWidth.value <= 1024) return 4
  return 6
})
const useDropdown = computed(() => favorites.value.length > favoriteLimit.value)
const favoritesOpen = ref(false)

const onResize = () => {
  viewportWidth.value = window.innerWidth
}
onMounted(() => {
  favorites.value = loadFavorites()
  viewportWidth.value = window.innerWidth
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeydown)
  }
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    favoritesOpen.value = false
    displayedFavorite.value = null
    pinned.value = null
    fieldHover.value = false
  }
}

const selectFromDropdown = (fav: Favorite) => {
  viewFavorite(fav)
  favoritesOpen.value = false
}

const persistFavorites = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
  }
}

const saveFavorite = () => {
  const cells = displayedPalette.value.map((cell) => ({ role: cell.role, hex: cell.hex }))
  const sig = cells.map((cell) => cell.hex).sort().join('|')
  const existing = favorites.value.find((favorite) => favorite.sig === sig)
  if (existing) {
    favorites.value = favorites.value.filter((favorite) => favorite.id !== existing.id)
    if (displayedFavorite.value?.sig === existing.sig) displayedFavorite.value = null
    persistFavorites()
    savedFlash.value = 'Removed from favorites'
  } else {
    const center = displayedCoord.value
    favorites.value = [
      { id: Date.now(), sig, center: { x: center.x, y: center.y }, cells },
      ...favorites.value
    ]
    persistFavorites()
    savedFlash.value = 'Saved to favorites'
  }
  if (typeof window !== 'undefined') window.setTimeout(() => { savedFlash.value = '' }, 2200)
}

const copyPalette = async () => {
  const text = JSON.stringify(displayedPalette.value.map((cell) => cell.hex))
  let copied = false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copied = true
    }
  } catch {
    copied = false
  }
  if (!copied && typeof document !== 'undefined') {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
      copied = true
    } catch {
      copied = false
    }
    document.body.removeChild(area)
  }
  savedFlash.value = copied ? 'Copied!' : 'Copy failed'
  if (typeof window !== 'undefined') window.setTimeout(() => { savedFlash.value = '' }, 2200)
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
    <div class="site-shell atlas-page" :class="{ 'theme-dark': theme === 'dark' }">
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
        <button
          class="theme-toggle"
          type="button"
          :class="{ 'is-dark': theme === 'dark' }"
          @click="toggleTheme"
          :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`"
        >
          <span class="theme-toggle-icons" aria-hidden="true">
            <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
              <line x1="4.5" y1="4.5" x2="6" y2="6" />
              <line x1="18" y1="18" x2="19.5" y2="19.5" />
              <line x1="4.5" y1="19.5" x2="6" y2="18" />
              <line x1="18" y1="6" x2="19.5" y2="4.5" />
            </svg>
            <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
        </button>
      </div>
    </header>

    <main class="atlas-main">
      <section class="atlas-intro" aria-labelledby="atlas-title">
        <div>
          <p class="eyebrow">ΚΡΑΣΙΣ / THE MIXING</p>
          <h1 id="atlas-title">Color, in <em>neighborhoods.</em></h1>
          <div class="favorites" v-if="favorites.length">
            <div v-if="useDropdown" class="favorites-dropdown">
              <button class="favorites-toggle" type="button" :aria-expanded="favoritesOpen" @click="favoritesOpen = !favoritesOpen">
                <svg class="favorites-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="9" y="1" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="1" y="9" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="9" y="9" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                </svg>
                <span class="favorites-toggle-label">Saved palettes</span>
                <span class="favorites-count">{{ favorites.length }}</span>
                <span class="favorites-caret" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="11" height="11">
                    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </span>
              </button>
              <template v-if="favoritesOpen">
                <div class="dropdown-scrim" @click="favoritesOpen = false"></div>
                <div class="favorites-menu" role="menu">
                  <div
                    v-for="fav in favorites"
                    :key="fav.id"
                    class="favorites-menu-item"
                    :aria-pressed="isCurrentFavorite(fav)"
                  >
                    <button class="menu-main" type="button" :aria-label="`View saved palette at ${formatPosition(fav.center.x)}, ${formatPosition(fav.center.y)}`" @click="selectFromDropdown(fav)">
                      <span class="chip-swatches">
                        <span
                          v-for="cell in fav.cells"
                          :key="cell.hex"
                          class="chip-swatch"
                          :style="{ backgroundColor: cell.hex }"
                        ></span>
                      </span>
                    </button>
                    <button class="chip-remove" type="button" :aria-label="`Remove favorite at ${fav.center.x}, ${fav.center.y}`" @click="removeFavorite(fav.id)">×</button>
                  </div>
                </div>
              </template>
            </div>
            <div v-else class="favorites-track">
              <div
                v-for="fav in favorites"
                :key="fav.id"
                class="favorite-chip"
                :aria-pressed="isCurrentFavorite(fav)"
              >
                <button class="chip-main" type="button" :aria-label="`View saved palette at ${formatPosition(fav.center.x)}, ${formatPosition(fav.center.y)}`" @click="viewFavorite(fav)">
                  <span class="chip-swatches">
                    <span
                      v-for="cell in fav.cells"
                      :key="cell.hex"
                      class="chip-swatch"
                      :style="{ backgroundColor: cell.hex }"
                    ></span>
                  </span>
                </button>
                <button class="chip-remove" type="button" :aria-label="`Remove favorite at ${fav.center.x}, ${fav.center.y}`" @click="removeFavorite(fav.id)">×</button>
              </div>
            </div>
          </div>
        </div>

        <aside class="palette-inspector" :class="{ 'is-linked': (fieldHover || pinned) && !displayedFavorite }" aria-label="Selected palette">
          <div class="inspector-heading">
            <span>PALETTE / {{ formatPosition(displayedCoord.x) }}, {{ formatPosition(displayedCoord.y) }}</span>
            <strong>{{ activePrimary.hex }}</strong>
          </div>
          <div class="inspector-grid">
            <div
              v-for="cell in displayedPalette"
              :key="`${cell.role}-${cell.key}`"
              class="inspector-cell"
              :style="{ backgroundColor: cell.hex, color: cell.ink }"
            >
              <span>{{ cell.role }}</span>
              <strong>{{ cell.hex }}</strong>
            </div>
          </div>
          <div class="inspector-actions">
            <button class="favorite-button" type="button" :class="{ 'is-saved': isFavorited }" :aria-pressed="isFavorited" :aria-label="isFavorited ? 'Remove from favorites' : 'Add to favorites'" @click="saveFavorite">
              <svg class="favorite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <button class="copy-button" type="button" aria-label="Copy hex colors" @click="copyPalette">
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <NuxtLink class="copy-button" :to="advancedTo" aria-label="Open preview">Preview</NuxtLink>
            <span class="favorite-flash" aria-live="polite">{{ savedFlash }}</span>
          </div>
        </aside>
      </section>

      <section id="atlas" class="atlas-stage" aria-label="Overlapping LCH palette field">
        <div class="stage-topline">
          <span>{{ fieldCells.length }} CELLS / 3 × 2 COLOR BLOCKS</span>
          <span>VERTICAL SCROLL TO EXPAND</span>
        </div>

          <div ref="fieldRef" class="field-viewport" @scroll="expandField" @mouseenter="fieldHover = true" @mouseleave="onLeaveField" @touchstart="onTouchField">
          <div
            class="field-grid"
            :class="{ 'is-locked': displayedFavorite }"
            :style="fieldStyle"
            role="grid"
            :aria-label="`Color field, ${fieldRowRadius * 2 + 1} rows by ${fieldColumnRadius * 2 + 1} columns`"
            :aria-rowcount="fieldRowRadius * 2 + 1"
            :aria-colcount="fieldColumnRadius * 2 + 1"
            @keydown="onGridKeydown"
          >
            <button
              v-for="cell in fieldCells"
              :key="cell.key"
              :id="`atlas-cell-${cell.x}-${cell.y}`"
              type="button"
              class="field-cell"
              :style="{ backgroundColor: cell.hex }"
              :tabindex="cell.x === activeCenter.x && cell.y === activeCenter.y ? 0 : -1"
              role="gridcell"
              :aria-rowindex="cell.y + fieldRowRadius + 1"
              :aria-colindex="cell.x + fieldColumnRadius + 1"
              :aria-label="`Use ${cell.hex} as the primary color at ${formatPosition(cell.x)}, ${formatPosition(cell.y)}`"
              @mouseenter="selectCenter(cell)"
              @focus="onCellFocus(cell)"
              @click="pinCenter(cell)"
            ></button>
            <div class="field-selection" :style="selectionStyle" aria-hidden="true" v-show="!displayedFavorite"></div>
          </div>
          <p class="sr-only" aria-live="polite">{{ srStatus }}</p>
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

.theme-dark {
  --paper: #0e1622;
  --ink: #e8eef6;
  --muted: #8aa0bb;
  --blue: #4f97e8;
  --line: rgba(232, 238, 246, 0.18);
}

.site-shell.theme-dark {
  background-image:
    linear-gradient(to right, rgba(232, 238, 246, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(232, 238, 246, 0.05) 1px, transparent 1px);
}

.theme-dark .atlas-stage {
  background: #0a121e;
  box-shadow: 12px 12px 0 rgba(79, 151, 232, 0.18);
}

.theme-dark .inspector-grid {
  background: rgba(232, 238, 246, 0.10);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.theme-dark .field-selection {
  box-shadow:
    0 0 0 2px rgba(247, 248, 246, 0.92),
    0 0 0 4px var(--blue),
    0 12px 26px rgba(0, 0, 0, 0.55);
}

.theme-dark .stage-topline span,
.theme-dark .stage-bottomline span {
  background: rgba(10, 18, 30, 0.82);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
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
  background-color: var(--paper);
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

.favorites {
  margin-top: 18px;
}

.favorites-track {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 10px;
  max-width: 460px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--blue) var(--paper);
  padding-bottom: 4px;
}

.favorites-dropdown {
  position: relative;
  display: inline-block;
}

.favorites-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.76rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.favorites-toggle-label {
  line-height: 1;
  font-weight: 600;
  padding-top: 3px;
}

.favorites-toggle:hover,
.favorites-toggle[aria-expanded="true"] {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 8%, transparent);
}

.favorites-icon {
  color: var(--muted);
  transition: color 0.18s ease;
}

.favorites-toggle:hover .favorites-icon,
.favorites-toggle[aria-expanded="true"] .favorites-icon {
  color: var(--blue);
}

.favorites-count {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 3px 5px 0;
  border-radius: 999px;
  background: var(--blue);
  color: #fff;
  font-size: 0.56rem;
  font-weight: 600;
  line-height: 1;
}

.favorites-caret {
  display: inline-flex;
  color: var(--muted);
  transition: transform 0.18s ease, color 0.18s ease;
}

.favorites-toggle:hover .favorites-caret,
.favorites-toggle[aria-expanded="true"] .favorites-caret {
  color: var(--blue);
  transform: rotate(180deg);
}

.dropdown-scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.favorites-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  min-width: 232px;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  box-shadow: 0 16px 40px rgba(8, 20, 38, 0.24);
  scrollbar-width: thin;
  scrollbar-color: var(--blue) var(--paper);
  transform-origin: top left;
  animation: favorites-pop 0.16s ease;
}

@keyframes favorites-pop {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.favorites-menu-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 9px;
  transition: background-color 0.15s ease;
}

.favorites-menu-item[aria-pressed="true"] {
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--blue) 40%, transparent);
}

.menu-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.menu-main:hover {
  color: var(--ink);
}

.favorites-menu-item[aria-pressed="true"] .menu-main {
  color: var(--ink);
}

.favorites-menu-item .chip-swatches {
  flex: 1 1 auto;
  border-radius: 5px;
}

.favorites-menu-item .chip-swatch {
  flex: 1 1 0;
  width: auto;
  min-width: 0;
  height: 17px;
}

.favorite-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 5px 4px 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
}

.favorite-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(8, 20, 38, 0.16);
  border-color: color-mix(in srgb, var(--blue) 50%, var(--line));
}

.favorite-chip[aria-pressed="true"] {
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 18%, transparent);
}

.chip-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 2px 2px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.chip-main:hover {
  color: var(--ink);
}

.favorite-chip[aria-pressed="true"] .chip-main {
  color: var(--ink);
}

.chip-swatches {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}

.chip-swatch {
  width: 14px;
  height: 14px;
  display: block;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.chip-remove:hover {
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 14%, transparent);
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

.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.theme-toggle:hover {
  color: var(--ink);
  border-color: var(--ink);
}

.theme-toggle-icons {
  position: relative;
  display: block;
  width: 17px;
  height: 17px;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle.is-dark .theme-toggle-icons {
  transform: rotate(360deg);
}

.theme-icon {
  position: absolute;
  inset: 0;
  width: 17px;
  height: 17px;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease;
}

.theme-icon-sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-icon-moon {
  opacity: 0;
  transform: rotate(-90deg) scale(0);
}

.theme-toggle.is-dark .theme-icon-sun {
  opacity: 0;
  transform: rotate(90deg) scale(0);
}

.theme-toggle.is-dark .theme-icon-moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
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

.inspector-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.favorite-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.favorite-button:hover {
  color: var(--blue);
  border-color: var(--blue);
}

.favorite-button.is-saved {
  color: var(--blue);
  border-color: var(--blue);
}

.favorite-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.favorite-button.is-saved .favorite-icon {
  fill: currentColor;
}

.favorite-flash {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.copy-button:hover {
  color: var(--blue);
  border-color: var(--blue);
}

.copy-icon {
  width: 14px;
  height: 14px;
  display: block;
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

.field-grid.is-locked .field-cell {
  cursor: default;
  outline: none;
}

.field-grid .field-cell:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
  position: relative;
  z-index: 3;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .field-selection,
  .field-cell,
  .field-viewport,
  .favorites-track,
  .favorites-menu,
  .favorite-chip,
  .favorite-button,
  .copy-button,
  .favorites-toggle,
  .theme-toggle-icons,
  .theme-icon {
    transition: none;
    animation: none;
  }
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: 1;
}

::view-transition-new(root) {
  z-index: 9999;
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
