<script setup lang="ts">
const route = useRoute()

const { theme, toggleTheme } = useTheme()

const sidebarOpen = ref(true)
const contextMode = ref<'app' | 'pixel'>('app')
const landingDark = ref(false)
const landColor = (role: string) => landingDark.value ? colorDark(role) : color(role)
const landItems = computed(() => landingDark.value ? itemsDark.value : itemsLight.value)
const toggleLandingTheme = () => { landingDark.value = !landingDark.value }

type PaletteItem = { role: string; hex: string }
type PalettePair = { light: PaletteItem[]; dark: PaletteItem[] }

const parsePalette = (raw: unknown): PalettePair => {
  if (typeof raw !== 'string') return { light: [], dark: [] }
  try {
    const parsed = JSON.parse(raw)
    const asItems = (value: unknown): PaletteItem[] =>
      Array.isArray(value)
        ? value.filter((entry): entry is PaletteItem => typeof entry === 'object' && entry !== null && 'role' in entry && 'hex' in entry).map((entry) => ({ role: String(entry.role), hex: String(entry.hex) }))
        : []
    if (parsed && typeof parsed === 'object' && 'light' in parsed && 'dark' in parsed) {
      return { light: asItems(parsed.light), dark: asItems(parsed.dark) }
    }
    if (Array.isArray(parsed)) {
      const arr = asItems(parsed)
      return { light: arr, dark: arr }
    }
    return { light: [], dark: [] }
  } catch {
    return { light: [], dark: [] }
  }
}

const items = ref<PalettePair>(parsePalette(route.query.palette))
const resetItems = () => { items.value = parsePalette(route.query.palette) }

const itemsLight = computed(() => items.value.light)
const itemsDark = computed(() => items.value.dark)
const hasPalette = computed(() => itemsLight.value.length > 0)
const byRoleLight = computed<Record<string, string>>(() => Object.fromEntries(itemsLight.value.map((item) => [item.role, item.hex])))
const byRoleDark = computed<Record<string, string>>(() => Object.fromEntries(itemsDark.value.map((item) => [item.role, item.hex])))
const color = (role: string) => byRoleLight.value[role] ?? '#000000'
const colorDark = (role: string) => byRoleDark.value[role] ?? '#000000'

const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
  }
  return [h, s * 100, l * 100]
}

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

type Role = 'background' | 'light' | 'primary' | 'accent' | 'dark' | 'shadow'
const ROLE_ORDER: Role[] = ['background', 'light', 'primary', 'accent', 'dark', 'shadow']
const HUE_SHIFT: Record<Role, number> = { background: 0, light: 8, primary: 0, accent: 34, dark: 14, shadow: 0 }
const LIGHT_TARGETS: Record<Role, [number, number]> = { background: [10, 95], light: [20, 84], primary: [52, 50], accent: [60, 58], dark: [30, 22], shadow: [24, 12] }
const DARK_TARGETS: Record<Role, [number, number]> = { background: [18, 12], light: [20, 20], primary: [60, 60], accent: [66, 66], dark: [22, 92], shadow: [18, 8] }

const generatePair = (): PalettePair => {
  const base = Math.random() * 360
  const make = (targets: Record<Role, [number, number]>) =>
    ROLE_ORDER.map((role) => {
      const [s, l] = targets[role]
      const h = ((base + HUE_SHIFT[role]) % 360 + 360) % 360
      return { role, hex: hslToHex(h, s, l) }
    })
  return { light: make(LIGHT_TARGETS), dark: make(DARK_TARGETS) }
}

const randomizePalette = () => { items.value = generatePair() }

const toDark = (hex: string, role: string): string => {
  const [h] = hexToHsl(hex)
  const target = DARK_TARGETS[role as Role] ?? [20, 14]
  return hslToHex(h, target[0], target[1])
}

const { favorites, addFavorite, removeFavorite, isFavorited: checkIsFavorited } = useFavorites()
const favoritesOpen = ref(false)
const favAbove = ref(false)
const favToggle = ref<HTMLElement | null>(null)
const favMenu = ref<HTMLElement | null>(null)

watch(favoritesOpen, (open) => {
  if (!open) return
  favAbove.value = false
  nextTick(() => {
    const toggle = favToggle.value
    const menu = favMenu.value
    if (!toggle || !menu) return
    const rect = toggle.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const menuHeight = menu.offsetHeight
    if (spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12) {
      favAbove.value = true
    }
  })
})

const selectFavorite = (fav: Favorite) => {
  const light = fav.cells.map((cell) => ({ role: cell.role, hex: cell.hex }))
  const dark = fav.cells.map((cell) => ({ role: cell.role, hex: toDark(cell.hex, cell.role) }))
  items.value = { light, dark }
  favoritesOpen.value = false
}

const currentSig = computed(() => itemsLight.value.map((item) => item.hex).sort().join('|'))
const isFavorited = computed(() => favorites.value.some((favorite) => favorite.sig === currentSig.value))

const saveFavorite = () => {
  const cells = itemsLight.value.map((item) => ({ role: item.role, hex: item.hex }))
  const sig = currentSig.value
  addFavorite({ sig, center: { x: 0, y: 0 }, cells })
}

const copiedKey = ref<string | null>(null)
const copy = async (text: string, key: string) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else if (typeof document !== 'undefined') {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    copiedKey.value = key
    setTimeout(() => { if (copiedKey.value === key) copiedKey.value = null }, 1500)
  } catch {
    /* ignore */
  }
}

const cssExport = computed(() => {
  const lightVars = itemsLight.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  const darkVars = itemsDark.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  const utils = itemsLight.value.map((item) => `.bg-${item.role} { background-color: var(--color-${item.role}); }\n.text-${item.role} { color: var(--color-${item.role}); }`).join('\n')
  return `:root {\n${lightVars}\n}\n\n.dark {\n${darkVars}\n}\n\n${utils}`
})

const tailwindExport = computed(() => {
  const lightVars = itemsLight.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  const darkVars = itemsDark.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  return `/* Tailwind CSS v4 — paste into your stylesheet */\n@import "tailwindcss";\n\n@theme {\n${lightVars}\n}\n\n.dark {\n${darkVars}\n}`
})

const unocssExport = computed(() => {
  const lightVars = itemsLight.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  const darkVars = itemsDark.value.map((item) => `  --color-${item.role}: ${item.hex};`).join('\n')
  const colors = itemsLight.value.map((item) => `      ${item.role}: 'var(--color-${item.role})',`).join('\n')
  return `// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
${colors}
    },
  },
  preflights: [
    {
      getCSS: () => \`:root {
${lightVars}
}

.dark {
${darkVars}
}\`,
    },
  ],
})`
})

const jsonExport = computed(() => JSON.stringify({
  light: Object.fromEntries(itemsLight.value.map((item) => [item.role, item.hex])),
  dark: Object.fromEntries(itemsDark.value.map((item) => [item.role, item.hex])),
}, null, 2))

const exports = computed(() => [
  { key: 'css', label: 'CSS classes', code: cssExport.value },
  { key: 'tailwind', label: 'Tailwind v4', code: tailwindExport.value },
  { key: 'unocss', label: 'UnoCSS', code: unocssExport.value },
  { key: 'json', label: 'JSON', code: jsonExport.value },
])

const expanded = reactive<Record<string, boolean>>({})
const toggleExport = (key: string) => { expanded[key] = !expanded[key] }

// A detailed pixel rendering of a scene from Homer's Odyssey, drawn
// procedurally with the palette roles so it recolors with the palette:
// Odysseus's ship sailing between Ithaca's temple and the Cyclops's cave,
// beneath the sun of Helios and Athena's owls.
type PixelCell = string | null

function buildGreekScene(): PixelCell[][] {
  const W = 64
  const H = 44
  const grid: PixelCell[][] = Array.from({ length: H }, () => Array<PixelCell>(W).fill(null))

  const set = (x: number, y: number, c: PixelCell) => {
    if (x >= 0 && x < W && y >= 0 && y < H) grid[y]![x] = c
  }
  const rect = (x0: number, y0: number, w: number, h: number, c: PixelCell) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c)
  }
  const hline = (x0: number, x1: number, y: number, c: PixelCell) => {
    for (let x = x0; x <= x1; x++) set(x, y, c)
  }
  const vline = (x: number, y0: number, y1: number, c: PixelCell) => {
    for (let y = y0; y <= y1; y++) set(x, y, c)
  }

  // --- Sky: sun of Helios with rays ---
  const sx = 54
  const sy = 6
  const sr = 3
  for (let y = -sr; y <= sr; y++) {
    for (let x = -sr; x <= sr; x++) {
      if (x * x + y * y <= sr * sr) set(sx + x, sy + y, 'accent')
    }
  }
  for (let i = 1; i <= 6; i++) {
    set(sx + i, sy - i, 'accent')
    set(sx - i, sy - i, 'accent')
    set(sx + i, sy + i, 'accent')
    set(sx - i, sy + i, 'accent')
  }

  // Clouds
  const cloud = (cx: number, cy: number) => {
    rect(cx, cy, 9, 2, 'light')
    rect(cx + 2, cy - 1, 5, 1, 'light')
    rect(cx + 1, cy + 2, 7, 1, 'light')
  }
  cloud(8, 4)
  cloud(26, 2)
  cloud(40, 9)

  // Owls of Athena (small accent birds)
  const bird = (x: number, y: number) => {
    set(x, y, 'accent')
    set(x + 1, y - 1, 'accent')
    set(x + 2, y, 'accent')
  }
  bird(20, 8)
  bird(36, 6)

  // --- Sea (fills the channel; lands drawn over it) ---
  const seaTop = 20
  const seaBot = 33
  rect(0, seaTop, W, seaBot - seaTop + 1, 'primary')
  for (let y = seaTop + 1; y <= seaBot; y += 2) {
    for (let x = 0; x < W; x += 3) {
      if (grid[y]![x] === 'primary') set(x, y, 'light')
    }
  }

  // --- Left: island of Ithaca with the palace temple ---
  const topLeft = (x: number) => {
    if (x <= 4) return Math.round(30 - (x / 4) * 14)
    if (x <= 15) return 16
    return Math.round(16 + ((x - 15) / 2) * 14)
  }
  for (let x = 0; x <= 17; x++) {
    for (let y = topLeft(x); y <= seaBot; y++) set(x, y, 'shadow')
  }
  // Temple on the plateau
  rect(4, 29, 12, 1, 'shadow') // stylobate step
  rect(4, 28, 12, 1, 'light')
  for (const cx of [5, 8, 11, 14]) {
    rect(cx, 21, 2, 7, 'light')
    rect(cx + 1, 21, 1, 7, 'shadow') // fluting
    rect(cx - 1, 20, 4, 1, 'light') // capital
  }
  rect(4, 19, 12, 1, 'primary')
  rect(4, 18, 12, 1, 'primary')
  for (const cx of [5, 8, 11, 14]) set(cx, 19, 'shadow') // triglyphs
  for (let y = 14; y <= 17; y++) {
    const t = (y - 14) / 3
    const half = Math.round(5.5 * t)
    for (let x = 9 - half; x <= 9 + half; x++) set(x, y, 'primary')
  }
  rect(8, 15, 2, 2, 'accent') // statue in the pediment

  // --- Right: the Cyclops's island with his cave ---
  const topRight = (x: number) => Math.round(24 - ((x - 46) / 17) * 10)
  for (let x = 46; x < W; x++) {
    for (let y = topRight(x); y <= seaBot; y++) set(x, y, 'shadow')
  }
  rect(50, 27, 7, 4, 'dark') // cave mouth
  // Polyphemus's single glowing eye
  set(53, 28, 'accent')
  set(52, 28, 'accent')
  set(54, 28, 'accent')
  set(53, 27, 'accent')
  set(53, 29, 'accent')
  // Flock of sheep
  set(48, 31, 'light')
  set(58, 31, 'light')
  set(60, 32, 'light')
  // Olive tree (gift of Athena)
  vline(60, 18, 24, 'shadow')
  rect(58, 16, 5, 2, 'light')

  // --- Odysseus's ship (trireme) sailing the channel ---
  rect(24, 32, 20, 1, 'dark') // keel
  rect(25, 31, 18, 1, 'dark')
  rect(27, 30, 15, 1, 'dark')
  rect(29, 29, 12, 1, 'dark')
  hline(29, 40, 28, 'light') // deck / gunwale
  vline(34, 14, 28, 'dark') // mast
  rect(27, 15, 15, 13, 'light') // sail
  hline(27, 41, 15, 'primary')
  hline(27, 41, 27, 'primary')
  vline(27, 15, 27, 'primary')
  vline(41, 15, 27, 'primary')
  set(34, 20, 'primary')
  set(33, 21, 'accent')
  set(35, 21, 'accent')
  set(34, 22, 'accent') // painted eye on the sail
  hline(18, 23, 31, 'shadow') // oars (port)
  hline(44, 45, 31, 'shadow') // oars (starboard)
  set(18, 30, 'shadow')
  set(23, 30, 'shadow')
  set(44, 30, 'shadow')
  set(45, 30, 'shadow')
  // Odysseus at the stern with his bow
  rect(40, 25, 2, 3, 'accent')
  set(40, 24, 'accent')
  set(41, 24, 'accent')
  set(42, 25, 'accent')
  set(43, 26, 'accent')
  // A crewman at the bow
  rect(27, 25, 2, 3, 'dark')
  set(27, 24, 'dark')

  return grid
}

const pixelArt: PixelCell[][] = buildGreekScene()
</script>

<template>
  <main class="adv-page" :class="{ 'theme-dark': theme === 'dark' }">
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

    <div class="adv-inner adv-layout" :class="{ 'is-collapsed': !sidebarOpen }">
      <aside class="adv-sidebar" v-if="hasPalette">
        <div class="adv-sidebar-body" id="adv-sidebar-body" v-show="sidebarOpen">
          <div class="adv-intro">
            <div class="adv-intro-row">
              <h1>Palette</h1>
              <button
                class="adv-fav-star"
                type="button"
                :class="{ 'is-saved': isFavorited }"
                :aria-pressed="isFavorited"
                :aria-label="isFavorited ? 'Remove from favorites' : 'Save palette to favorites'"
                @click="saveFavorite"
              >
                <svg class="adv-star-icon" :fill="isFavorited ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            </div>
          </div>

          <section class="adv-variant" :class="{ 'is-active': theme === 'light' }">
            <h4 class="adv-variant-label">Light</h4>
            <div class="adv-swatches">
              <div
                v-for="item in itemsLight"
                :key="item.role"
                class="adv-swatch"
                :style="{ backgroundColor: item.hex }"
                :title="`${item.role} ${item.hex}`"
              >
                <span class="adv-swatch-role">{{ item.role }}</span>
                <span class="adv-swatch-hex">{{ item.hex }}</span>
              </div>
            </div>
          </section>

          <section class="adv-variant" :class="{ 'is-active': theme === 'dark' }">
            <h4 class="adv-variant-label">Dark</h4>
            <div class="adv-swatches">
              <div
                v-for="item in itemsDark"
                :key="item.role"
                class="adv-swatch"
                :style="{ backgroundColor: item.hex }"
                :title="`${item.role} ${item.hex}`"
              >
                <span class="adv-swatch-role">{{ item.role }}</span>
                <span class="adv-swatch-hex">{{ item.hex }}</span>
              </div>
            </div>
          </section>

          <section class="adv-section">
            <h2>Export</h2>
            <div class="adv-export-grid">
              <article v-for="entry in exports" :key="entry.key" class="adv-export">
                <div class="adv-export-head">
                  <h3>{{ entry.label }}</h3>
                  <div class="adv-export-actions">
                    <button class="adv-copy" type="button" :aria-label="`Copy ${entry.label} code`" @click="copy(entry.code, entry.key)">
                      <svg v-if="copiedKey === entry.key" class="adv-act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <svg v-else class="adv-act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button
                      class="adv-expand"
                      type="button"
                      :aria-expanded="!!expanded[entry.key]"
                      :aria-label="expanded[entry.key] ? `Hide ${entry.label} code` : `Show ${entry.label} code`"
                      @click="toggleExport(entry.key)"
                    >
                      <svg class="adv-act-icon" :class="{ 'is-expanded': expanded[entry.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                <pre v-show="expanded[entry.key]" class="adv-code"><code>{{ entry.code }}</code></pre>
              </article>
            </div>
          </section>

          <section class="adv-section adv-try">
            <h2>Try other combinations</h2>
            <div class="adv-try-actions">
              <button class="adv-try-btn" type="button" @click="randomizePalette">Randomize</button>
              <button class="adv-try-btn adv-try-ghost" type="button" @click="resetItems">Reset</button>
            </div>

            <div class="adv-fav">
              <button
                class="adv-fav-toggle"
                ref="favToggle"
                type="button"
                :aria-expanded="favoritesOpen"
                @click="favoritesOpen = !favoritesOpen"
              >
                <svg class="adv-fav-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="9" y="1" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="1" y="9" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                  <rect x="9" y="9" width="6" height="6" rx="1.6" fill="currentColor"></rect>
                </svg>
                <span>Saved palettes</span>
                <span class="adv-fav-count">{{ favorites.length }}</span>
                <svg class="adv-fav-caret" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>

              <template v-if="favoritesOpen">
                <div class="adv-fav-scrim" @click="favoritesOpen = false"></div>
                <div class="adv-fav-menu" ref="favMenu" :class="{ 'is-above': favAbove }" role="menu">
                  <p v-if="favorites.length === 0" class="adv-fav-empty">No saved palettes yet.</p>
                  <div v-for="fav in favorites" :key="fav.id" class="adv-fav-item">
                    <button class="adv-fav-main" type="button" :aria-label="`Load saved palette`" @click="selectFavorite(fav)">
                      <span class="adv-fav-swatches">
                        <span
                          v-for="cell in fav.cells"
                          :key="cell.hex"
                          class="adv-fav-swatch"
                          :style="{ backgroundColor: cell.hex }"
                        ></span>
                      </span>
                    </button>
                    <button class="adv-fav-remove" type="button" :aria-label="`Remove favorite`" @click="removeFavorite(fav.id)">×</button>
                  </div>
                </div>
              </template>
            </div>
          </section>
        </div>
        <div class="adv-rail" aria-hidden="true">
          <span
            v-for="item in itemsLight"
            :key="item.role"
            class="adv-rail-swatch"
            :style="{ backgroundColor: item.hex }"
          ></span>
        </div>
      </aside>

      <div class="adv-main" v-if="hasPalette">
        <header class="adv-inset-header">
          <button
            class="adv-trigger"
            type="button"
            @click="sidebarOpen = !sidebarOpen"
            :aria-label="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
            :aria-expanded="sidebarOpen"
            aria-controls="adv-sidebar-body"
          >
            <svg class="adv-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M9 3v18"></path>
            </svg>
          </button>
          <span class="adv-inset-title">Preview</span>
        </header>
        <section class="adv-section">
          <div class="adv-section-head">
            <h2>In context</h2>
            <div class="adv-toggle" role="tablist" aria-label="Context preview">
              <button
                class="adv-toggle-btn"
                type="button"
                role="tab"
                :aria-selected="contextMode === 'app'"
                :class="{ 'is-active': contextMode === 'app' }"
                @click="contextMode = 'app'"
              >Application</button>
              <button
                class="adv-toggle-btn"
                type="button"
                role="tab"
                :aria-selected="contextMode === 'pixel'"
                :class="{ 'is-active': contextMode === 'pixel' }"
                @click="contextMode = 'pixel'"
              >Pixel art</button>
            </div>
          </div>

          <div class="adv-landing" v-if="contextMode === 'app'" :class="{ 'is-dark': landingDark }" :style="{ backgroundColor: landColor('background'), color: landColor('dark') }">
            <header class="ln-nav">
              <a class="ln-brand" href="#" @click.prevent>
                <span class="ln-mark">
                  <span class="ln-mark-a" :style="{ backgroundColor: landColor('primary') }"></span>
                  <span class="ln-mark-b" :style="{ backgroundColor: landColor('accent') }"></span>
                </span>
                <span class="ln-word">Krasis</span>
              </a>
              <nav class="ln-links" aria-label="Primary">
                <a href="#" @click.prevent>Work</a>
                <a href="#" @click.prevent>Process</a>
                <a href="#" @click.prevent>Journal</a>
                <a href="#" @click.prevent>About</a>
              </nav>
              <div class="ln-actions">
                <button
                  class="ln-theme"
                  type="button"
                  :style="{ color: landColor('dark') }"
                  @click="toggleLandingTheme"
                  :aria-label="`Switch to ${landingDark ? 'light' : 'dark'} theme`"
                >
                  <svg v-if="!landingDark" class="ln-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="12" y1="2" x2="12" y2="4"></line>
                    <line x1="12" y1="20" x2="12" y2="22"></line>
                    <line x1="2" y1="12" x2="4" y2="12"></line>
                    <line x1="20" y1="12" x2="22" y2="12"></line>
                    <line x1="4.5" y1="4.5" x2="6" y2="6"></line>
                    <line x1="18" y1="18" x2="19.5" y2="19.5"></line>
                    <line x1="4.5" y1="19.5" x2="6" y2="18"></line>
                    <line x1="18" y1="6" x2="19.5" y2="4.5"></line>
                  </svg>
                  <svg v-else class="ln-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                </button>
                <a class="ln-cta-btn" href="#" @click.prevent :style="{ backgroundColor: landColor('primary'), color: landColor('background') }">Start a project</a>
              </div>
            </header>

            <section class="ln-hero">
              <div class="ln-hero-copy">
                <p class="ln-eyebrow" :style="{ color: landColor('accent') }">Generative color systems</p>
                <h1 class="ln-title">Palettes that <em :style="{ color: landColor('primary') }">live</em> in neighborhoods of hue.</h1>
                <p class="ln-lede ln-muted">Krasis grows a coherent six-color system from a single seed — tuned for both light and dark surfaces, and exported to CSS, Tailwind, or UnoCSS in one click.</p>
                <div class="ln-hero-actions">
                  <a class="ln-btn ln-btn-solid" href="#" @click.prevent :style="{ backgroundColor: landColor('primary'), color: landColor('background') }">Open the atlas</a>
                  <a class="ln-btn ln-btn-ghost" href="#" @click.prevent :style="{ borderColor: 'color-mix(in srgb, currentColor 24%, transparent)', color: landColor('dark') }">Read the method</a>
                </div>
                <dl class="ln-stats">
                  <div><dt>6</dt><dd>role colors</dd></div>
                  <div><dt>2</dt><dd>themes</dd></div>
                  <div><dt>∞</dt><dd>seeds</dd></div>
                </dl>
              </div>

              <div class="ln-hero-visual">
                <div class="ln-art" :class="{ 'is-dark': landingDark }" :style="{ backgroundColor: landColor('light') }">
                  <span class="ln-blob ln-blob-1" :style="{ background: `radial-gradient(circle at 30% 30%, ${landColor('primary')}, transparent 70%)` }"></span>
                  <span class="ln-blob ln-blob-2" :style="{ background: `radial-gradient(circle at 72% 56%, ${landColor('accent')}, transparent 70%)` }"></span>
                  <span class="ln-blob ln-blob-3" :style="{ background: `radial-gradient(circle at 52% 86%, ${landColor('dark')}, transparent 72%)` }"></span>
                  <div class="ln-art-card" :style="{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)', color: landColor('dark') }">
                    <span class="ln-art-label ln-muted">SEED</span>
                    <span class="ln-art-hex">{{ landColor('primary') }}</span>
                  </div>
                  <div class="ln-art-swatches">
                    <span
                      v-for="item in landItems"
                      :key="item.role"
                      class="ln-art-swatch"
                      :style="{ backgroundColor: item.hex }"
                      :title="`${item.role} ${item.hex}`"
                    ></span>
                  </div>
                </div>
              </div>
            </section>

            <section class="ln-strip" aria-label="Palette">
              <div class="ln-strip-track">
                <div
                  v-for="item in landItems"
                  :key="item.role"
                  class="ln-strip-cell"
                  :style="{ backgroundColor: item.hex }"
                >
                  <span class="ln-strip-role">{{ item.role }}</span>
                  <span class="ln-strip-hex">{{ item.hex }}</span>
                </div>
              </div>
            </section>

            <section class="ln-features">
              <article class="ln-feature">
                <span class="ln-feature-icon" :style="{ backgroundColor: landColor('primary') }"></span>
                <h3>Coherent by construction</h3>
                <p class="ln-muted">Every color shares a hue lineage, so combinations never clash — even across light and dark.</p>
              </article>
              <article class="ln-feature">
                <span class="ln-feature-icon" :style="{ backgroundColor: landColor('accent') }"></span>
                <h3>Two themes, one seed</h3>
                <p class="ln-muted">Generate a light and a dark variant from the same source and ship both without rework.</p>
              </article>
              <article class="ln-feature">
                <span class="ln-feature-icon" :style="{ backgroundColor: landColor('dark') }"></span>
                <h3>Export anywhere</h3>
                <p class="ln-muted">Copy CSS variables, Tailwind v4 tokens, or an UnoCSS config — ready to paste.</p>
              </article>
            </section>

            <section class="ln-cta">
              <div class="ln-cta-panel" :style="{ backgroundColor: landColor('light') }">
                <div class="ln-cta-copy">
                  <h2 :style="{ color: landColor('dark') }">Build your next palette.</h2>
                  <p class="ln-muted">Leave your email and we'll send the atlas link.</p>
                </div>
                <form class="ln-form" @submit.prevent>
                  <input
                    class="ln-input"
                    type="email"
                    placeholder="you@studio.com"
                    aria-label="Email"
                    :style="{ backgroundColor: landColor('background'), color: landColor('dark'), borderColor: 'color-mix(in srgb, currentColor 22%, transparent)' }"
                  />
                  <button class="ln-submit" type="submit" :style="{ backgroundColor: landColor('accent'), color: landColor('background') }">Request access</button>
                </form>
              </div>
            </section>

            <footer class="ln-footer">
              <span class="ln-word">Krasis</span>
              <span class="ln-muted">© 2026 — Color studies</span>
            </footer>
          </div>

          <div class="adv-pixel-view" v-else>
            <article class="adv-card adv-card-wide">
              <h3>Pixel art</h3>
              <div class="adv-pixel" :style="{ backgroundColor: color('background') }">
                <div
                  v-for="(row, rowIndex) in pixelArt"
                  :key="rowIndex"
                  class="adv-pixel-row"
                >
                  <span
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    class="adv-pixel-cell"
                    :style="cell ? { backgroundColor: color(cell) } : { visibility: 'hidden' }"
                  ></span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section v-if="!hasPalette" class="adv-empty">
        <p>No palette provided.</p>
        <a class="adv-back" href="/">Back to the atlas</a>
      </section>
    </div>
  </main>
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

.adv-page.theme-dark,
.theme-dark {
  --paper: #0e1622;
  --ink: #e8eef6;
  --muted: #8aa0bb;
  --blue: #4f97e8;
  --line: rgba(232, 238, 246, 0.18);
}

.adv-page {
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--mono);
  overflow-x: hidden;
}

.site-header,
.adv-inner {
  width: min(1500px, calc(100% - 48px));
  margin-inline: auto;
}

.adv-inner {
  padding: clamp(20px, 4vw, 48px) 0 64px;
}

.adv-layout {
  display: grid;
  grid-template-columns: minmax(0, 300px) 1fr;
  gap: clamp(20px, 3vw, 40px);
  align-items: start;
  margin-top: clamp(12px, 2vw, 24px);
}

.adv-layout.is-collapsed {
  grid-template-columns: 48px minmax(0, 1fr);
}

.adv-layout.is-collapsed .adv-rail {
  display: flex;
}

.adv-main {
  min-width: 0;
}

.adv-sidebar {
  position: sticky;
  top: 18px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(20px, 3vw, 32px);
  background: color-mix(in srgb, var(--ink) 4%, var(--paper));
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
}

.adv-layout.is-collapsed .adv-sidebar {
  align-items: center;
  padding: 12px 0;
}

.adv-inset-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: clamp(16px, 2vw, 28px);
  border-bottom: 1px solid var(--line);
}

.adv-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.adv-trigger:hover {
  color: var(--ink);
  border-color: var(--ink);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.adv-trigger-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.adv-inset-title {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.adv-rail {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.adv-rail-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--line);
}

.adv-sidebar-body {
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 3vw, 36px);
  min-width: 0;
}

.adv-intro {
  margin-bottom: 0;
}

.adv-intro h1 {
  margin: 0;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.adv-intro-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.adv-fav-star {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.adv-fav-star:hover {
  color: var(--blue);
  border-color: var(--blue);
}

.adv-fav-star.is-saved {
  color: var(--blue);
  border-color: var(--blue);
  background: color-mix(in srgb, var(--blue) 12%, transparent);
}

.adv-star-icon {
  width: 17px;
  height: 17px;
}

.adv-variant {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.adv-variant.is-active {
  opacity: 1;
}

.adv-variant.is-active .adv-variant-label {
  color: var(--blue);
}

.adv-variant-label {
  flex: 0 0 auto;
  width: 34px;
  margin: 0;
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.adv-swatches {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 5px;
}

.adv-swatch {
  position: relative;
  flex: 1 1 0;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.adv-swatch-role,
.adv-swatch-hex {
  display: none;
}

.adv-section {
  margin-bottom: 0;
}

.adv-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.adv-section .adv-section-head h2 {
  margin: 0;
}

.adv-toggle {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.adv-toggle-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.adv-toggle-btn:hover {
  color: var(--ink);
}

.adv-toggle-btn.is-active {
  background: var(--ink);
  color: var(--paper);
}

.adv-section h2 {
  margin: 0 0 16px;
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.adv-pixel-view .adv-pixel {
  padding: 28px;
}

.adv-pixel-view .adv-pixel-cell {
  width: clamp(5px, 1.3vw, 11px);
  height: clamp(5px, 1.3vw, 11px);
}

.adv-landing {
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  --ln-line: color-mix(in srgb, currentColor 14%, transparent);
}

.adv-landing * {
  box-sizing: border-box;
}

.ln-muted {
  opacity: 0.66;
}

.ln-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px clamp(18px, 3vw, 34px);
  border-bottom: 1px solid var(--ln-line);
}

.ln-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  color: inherit;
}

.ln-mark {
  position: relative;
  width: 24px;
  height: 24px;
}

.ln-mark-a,
.ln-mark-b {
  position: absolute;
  width: 15px;
  height: 15px;
  border-radius: 5px;
}

.ln-mark-a {
  top: 0;
  left: 0;
}

.ln-mark-b {
  right: 0;
  bottom: 0;
  mix-blend-mode: multiply;
}

.adv-landing.is-dark .ln-mark-b,
.ln-art.is-dark .ln-mark-b {
  mix-blend-mode: screen;
}

.ln-word {
  font-family: var(--serif);
  font-size: 1.18rem;
  letter-spacing: -0.01em;
}

.ln-links {
  display: flex;
  gap: 26px;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ln-links a {
  color: inherit;
  text-decoration: none;
  opacity: 0.72;
  transition: opacity 0.15s ease;
}

.ln-links a:hover {
  opacity: 1;
}

.ln-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ln-theme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--ln-line);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.4s ease;
}

.ln-theme:hover {
  opacity: 0.7;
}

.ln-theme-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.ln-cta-btn {
  display: inline-flex;
  align-items: center;
  border: 0;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.ln-cta-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.ln-hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: clamp(24px, 4vw, 56px);
  align-items: center;
  padding: clamp(34px, 6vw, 72px) clamp(18px, 3vw, 34px);
}

.ln-hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}

.ln-eyebrow {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.24em;
  font-weight: 700;
  text-transform: uppercase;
}

.ln-title {
  margin: 0;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(2.4rem, 5.2vw, 4rem);
  letter-spacing: -0.035em;
  line-height: 0.98;
}

.ln-title em {
  font-style: italic;
}

.ln-lede {
  margin: 0;
  max-width: 44ch;
  font-size: 0.92rem;
  line-height: 1.6;
}

.ln-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ln-btn {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 12px 24px;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
}

.ln-btn-solid:hover,
.ln-btn-ghost:hover {
  transform: translateY(-1px);
}

.ln-btn-solid {
  border: 0;
}

.ln-btn-ghost {
  border: 1px solid;
  background: transparent;
}

.ln-stats {
  display: flex;
  gap: 30px;
  margin: 6px 0 0;
  padding: 0;
}

.ln-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ln-stats dt {
  font-family: var(--serif);
  font-size: 1.7rem;
  line-height: 1;
}

.ln-stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}

.ln-hero-visual {
  align-self: stretch;
  display: flex;
}

.ln-art {
  position: relative;
  flex: 1 1 auto;
  min-height: 320px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--ln-line);
}

.ln-blob {
  position: absolute;
  width: 62%;
  height: 62%;
  border-radius: 999px;
  filter: blur(26px);
  opacity: 0.85;
}

.ln-blob-1 {
  top: -8%;
  left: -6%;
}

.ln-blob-2 {
  top: 18%;
  right: -10%;
}

.ln-blob-3 {
  bottom: -12%;
  left: 22%;
  opacity: 0.5;
}

.ln-art.is-dark .ln-blob {
  mix-blend-mode: screen;
}

.ln-art-card {
  position: absolute;
  top: 18px;
  left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border: 1px solid;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(6px);
}

.adv-landing.is-dark .ln-art-card {
  background: rgba(8, 14, 26, 0.5);
}

.ln-art-label {
  font-family: var(--mono);
  font-size: 0.54rem;
  letter-spacing: 0.2em;
}

.ln-art-hex {
  font-family: var(--mono);
  font-size: 0.84rem;
  letter-spacing: 0.02em;
}

.ln-art-swatches {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  display: flex;
  gap: 6px;
}

.ln-art-swatch {
  flex: 1 1 0;
  height: 30px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #000 12%, transparent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.ln-strip {
  padding: 0 clamp(18px, 3vw, 34px);
  margin-top: -8px;
}

.ln-strip-track {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  border: 1px solid var(--ln-line);
  border-radius: 14px;
  overflow: hidden;
}

.ln-strip-cell {
  position: relative;
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  padding: 10px;
}

.ln-strip-role {
  font-family: var(--mono);
  font-size: 0.52rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.ln-strip-hex {
  font-family: var(--mono);
  font-size: 0.56rem;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.ln-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(14px, 2vw, 22px);
  padding: clamp(30px, 5vw, 56px) clamp(18px, 3vw, 34px);
}

.ln-feature {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--ln-line);
  border-radius: 14px;
}

.ln-feature-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
}

.ln-feature h3 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 400;
  font-size: 1.18rem;
  letter-spacing: -0.01em;
}

.ln-feature p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
}

.ln-cta {
  padding: 0 clamp(18px, 3vw, 34px) clamp(30px, 5vw, 56px);
}

.ln-cta-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding: clamp(24px, 4vw, 40px);
  border-radius: 16px;
  border: 1px solid var(--ln-line);
}

.ln-cta-copy h2 {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  letter-spacing: -0.02em;
}

.ln-cta-copy p {
  margin: 0;
  font-size: 0.84rem;
}

.ln-form {
  display: flex;
  gap: 10px;
  flex: 1 1 280px;
  max-width: 420px;
}

.ln-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 36px;
  border: 1px solid;
  border-radius: 999px;
  padding: 0 16px;
  font: inherit;
  font-size: 0.78rem;
}

.ln-input::placeholder {
  opacity: 0.5;
}

.ln-submit {
  flex: 0 0 auto;
  height: 36px;
  border: 0;
  border-radius: 999px;
  padding: 11px 22px;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.ln-submit:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.ln-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px clamp(18px, 3vw, 34px) 26px;
  border-top: 1px solid var(--ln-line);
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.adv-try {
  margin-top: 4px;
}

.adv-try-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.adv-try-btn {
  flex: 1 1 0;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 14px;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.adv-try-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
}

.adv-try-ghost {
  color: var(--muted);
}

.adv-fav {
  position: relative;
}

.adv-fav-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.adv-fav-toggle:hover {
  border-color: var(--blue);
  color: var(--blue);
}

.adv-fav-icon {
  opacity: 0.7;
}

.adv-fav-count {
  margin-left: auto;
  font-size: 0.64rem;
  color: var(--muted);
}

.adv-fav-caret {
  opacity: 0.6;
}

.adv-fav-scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.adv-fav-menu {
  position: absolute;
  z-index: 41;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  box-shadow: 0 18px 40px rgba(14, 44, 83, 0.18);
  max-height: 240px;
  overflow-y: auto;
}

.adv-fav-menu.is-above {
  top: auto;
  bottom: calc(100% + 8px);
}

.adv-page.theme-dark .adv-fav-menu {
  background: #0e1622;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
}

.adv-fav-empty {
  margin: 0;
  padding: 6px 4px;
  font-size: 0.66rem;
  color: var(--muted);
}

.adv-fav-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.adv-fav-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.adv-fav-main:hover {
  border-color: var(--blue);
}

.adv-fav-swatches {
  display: flex;
  gap: 4px;
  width: 100%;
}

.adv-fav-swatch {
  flex: 1 1 0;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--line);
}

.adv-fav-remove {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.adv-fav-remove:hover {
  color: #c0392b;
  border-color: #c0392b;
}

.adv-export-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(12px, 2vw, 20px);
}

.adv-export {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--paper) 92%, var(--ink));
}

.adv-export-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
}

.adv-export-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.adv-export-head h3 {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.adv-copy,
.adv-expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.adv-copy:hover,
.adv-expand:hover {
  color: var(--blue);
  border-color: var(--blue);
}

.adv-act-icon {
  width: 14px;
  height: 14px;
  display: block;
  transition: transform 0.2s ease;
}

.adv-act-icon.is-expanded {
  transform: rotate(180deg);
}

.adv-code {
  margin: 0;
  padding: 14px;
  font-family: var(--mono);
  font-size: 0.64rem;
  line-height: 1.5;
  color: var(--ink);
  overflow-x: auto;
  white-space: pre;
}

.adv-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 2vw, 20px);
}

.adv-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  background: color-mix(in srgb, var(--paper) 92%, var(--ink));
}

.adv-card-wide {
  grid-column: 1 / -1;
}

.adv-card h3 {
  margin: 0 0 14px;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.adv-themes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.adv-theme {
  border-radius: 10px;
  padding: 18px;
  border: 1px solid var(--line);
}

.adv-sample {
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.adv-sample strong {
  font-size: 0.9rem;
}

.adv-sample p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

.adv-sample-btn {
  align-self: flex-start;
  border: 0;
  border-radius: 999px;
  padding: 6px 16px;
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.adv-site {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.adv-site-bar {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
}

.adv-site-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  opacity: 0.9;
}

.adv-site-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}

.adv-site-nav strong {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.adv-site-link {
  font-size: 0.68rem;
}

.adv-site-hero {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.adv-site-hero h4 {
  margin: 0;
  font-size: 1rem;
}

.adv-site-hero p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
  max-width: 32ch;
}

.adv-site-cta {
  align-self: flex-start;
  margin-top: 6px;
  border: 0;
  border-radius: 999px;
  padding: 7px 18px;
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.adv-site-card {
  margin: 0 16px 16px;
  border: 1px solid;
  border-radius: 8px;
  padding: 14px;
}

.adv-site-card p {
  margin: 6px 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

.adv-site-tag {
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  font-weight: 700;
}

.adv-logo {
  border-radius: 10px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--line);
}

.adv-logo-mark {
  position: relative;
  width: 64px;
  height: 64px;
}

.adv-logo-circle {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  top: 0;
  left: 0;
}

.adv-logo-circle-2 {
  top: 18px;
  left: 20px;
  mix-blend-mode: multiply;
  opacity: 0.85;
}

.adv-logo-word {
  font-size: 1.1rem;
  letter-spacing: 0.04em;
}

.adv-loader {
  border-radius: 10px;
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
}

.adv-loader-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  animation: adv-bounce 0.9s ease-in-out infinite;
}

.adv-loader-dot-2 {
  animation-delay: 0.15s;
}

.adv-loader-dot-3 {
  animation-delay: 0.3s;
}

@keyframes adv-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50% { transform: translateY(-12px); opacity: 1; }
}

.adv-pixel {
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
}

.adv-pixel-row {
  display: flex;
}

.adv-pixel-cell {
  width: 20px;
  height: 20px;
}

.adv-empty {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--muted);
}

.adv-back {
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
  transition: color 0.15s ease, border-color 0.15s ease;
}

.adv-back:hover {
  color: var(--blue);
  border-color: var(--blue);
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle-icons,
  .theme-icon,
  .adv-loader-dot {
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

  .adv-layout {
    grid-template-columns: 1fr;
  }

  /* Preview first, palette below on narrow screens. */
  .adv-main {
    order: -1;
  }

  /* Collapse is a desktop affordance; on narrow screens the sidebar is
     always shown, so hide the dead toggle. */
  .adv-trigger {
    display: none;
  }

  /* Collapsing must never hide the sidebar. On narrow screens the 48px rail
     is meaningless, so keep the full sidebar visible instead. !important
     overrides the inline display:none that v-show sets on the body. */
  .adv-layout.is-collapsed .adv-sidebar {
    display: block;
    padding: 16px;
  }

  .adv-sidebar-body {
    display: flex !important;
  }

  .adv-rail {
    display: none !important;
  }

  .adv-sidebar {
    position: static;
  }

  .adv-grid,
  .adv-themes {
    grid-template-columns: 1fr;
  }

  .ln-links {
    display: none;
  }

  .ln-hero {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .ln-hero-visual {
    order: -1;
  }

  .ln-features {
    grid-template-columns: 1fr;
  }

  .adv-card-wide {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  .site-header,
  .adv-inner {
    width: min(1500px, calc(100% - 24px));
  }

  .adv-inner {
    padding: 20px 0 48px;
  }

  .adv-layout {
    gap: 20px;
    margin-top: 16px;
  }

  .adv-sidebar {
    padding: 14px;
  }

  .adv-swatches {
    gap: 6px;
  }

  .ln-links {
    display: none;
  }

  .ln-hero {
    grid-template-columns: 1fr;
    padding: 30px 20px;
  }

  .ln-hero-visual {
    order: -1;
  }

  .ln-art {
    min-height: 240px;
  }

  .ln-stats {
    gap: 22px;
  }

  .ln-features {
    grid-template-columns: 1fr;
    padding: 30px 20px;
  }

  .ln-strip-track {
    grid-template-columns: repeat(3, 1fr);
  }

  .ln-cta-panel {
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 28px;
    flex-wrap: nowrap;
    min-height: 35vh;
    max-height: 35vh;
  }

  .ln-form {
    width: 100%;
    max-width: none;
    flex-direction: column;
    gap: 16px;
    margin-top: auto;
  }

  /* Full-width fields should not be giant pills on phones. */
  .ln-input,
  .ln-submit {
    border-radius: 12px;
  }

  .ln-input {
    font-size: 0.72rem;
    height: 36px;
    flex: 0 0 auto;
    padding: 0 12px;
  }

  .ln-submit {
    width: 100%;
  }

  .adv-pixel-view .adv-pixel {
    padding: 12px;
  }

  .adv-pixel-view .adv-pixel-cell {
    width: clamp(4px, 1.3vw, 11px);
    height: clamp(4px, 1.3vw, 11px);
  }
}
</style>
