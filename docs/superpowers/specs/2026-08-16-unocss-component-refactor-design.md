# Design Specification: UnoCSS Integration & Shared Component Refactoring with TDD

Date: 2026-08-16
Status: Approved

## Overview
This specification details the migration of Krasis to **UnoCSS**, standardizing design tokens (font scale, radii, theme colors) and extracting shared UI primitives (`ThemeToggle`, `FavoritesDrawer`, `SwatchCard`) using **Red-Green TDD**.

---

## 1. UnoCSS Configuration & Design Tokens (`uno.config.ts`)

- **Module**: `@unocss/nuxt` registered in `nuxt.config.ts`.
- **Dark Mode**: `.theme-dark` class-based dark mode selector.
- **Theme Tokens**:
  - `colors`:
    - `surface-base`: `var(--surface-base)`
    - `surface-elevated`: `var(--surface-elevated)`
    - `border-subtle`: `var(--border-subtle)`
    - `text-main`: `var(--text-main)`
    - `text-subtle`: `var(--text-subtle)`
    - `accent`: `var(--accent)`
  - `fontFamily`: `mono: 'JetBrains Mono, Fira Code, monospace'`
  - `borderRadius`: `sm: '4px'`, `md: '8px'`, `lg: '12px'`, `xl: '16px'`
- **Shortcuts**:
  - `btn-icon`: `p-2 rounded-lg transition-colors flex items-center justify-center`
  - `card-surface`: `rounded-xl border border-border-subtle bg-surface-elevated`
  - `chip-badge`: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono`
  - `drawer-panel`: `absolute z-50 rounded-xl border border-border-subtle bg-surface-elevated shadow-xl`

---

## 2. Component Architecture & Test-Driven Specifications

### `app/components/ThemeToggle.vue`
- **Props**: None.
- **State**: Consumes `useTheme()`.
- **Behavior**: Renders theme toggle button, aria-label, sun/moon icons, and calls `toggleTheme()` on click.
- **TDD Test Suite**: `tests/components/ThemeToggle.spec.ts`
  - Test 1: Renders toggle button with aria-label matching theme state.
  - Test 2: Calls `toggleTheme()` when clicked.

### `app/components/FavoritesDrawer.vue`
- **Props**: None.
- **State**: Consumes `useFavorites()` and `useTheme()`.
- **Behavior**:
  - Renders favorites dropdown trigger button with count badge.
  - Toggles dropdown menu when clicked.
  - Displays empty message or list of saved favorite chips.
  - Calls `removeFavorite()` when chip remove button is clicked.
  - Emits `selectFavorite(fav)` when favorite chip main action is clicked.
- **TDD Test Suite**: `tests/components/FavoritesDrawer.spec.ts`
  - Test 1: Renders favorite count badge.
  - Test 2: Toggles drawer menu visibility on click.
  - Test 3: Emits `select` event when favorite item is clicked.

### `app/components/SwatchCard.vue`
- **Props**:
  - `role: string`
  - `hex: string`
  - `ink?: string`
  - `compact?: boolean`
- **Behavior**:
  - Renders color preview box with background style set to `hex`.
  - Displays uppercase role name and uppercase hex code.
  - Applies compact styling when `compact` prop is true.
- **TDD Test Suite**: `tests/components/SwatchCard.spec.ts`
  - Test 1: Displays role name and hex code.
  - Test 2: Applies background color style matching `hex`.

---

## 3. Page Refactoring Strategy

- **`index.vue`**:
  - Replace inline theme button with `<ThemeToggle />`.
  - Replace inline favorites drawer with `<FavoritesDrawer @select="viewFavorite" />`.
  - Replace `.inspector-cell` elements with `<SwatchCard :role="cell.role" :hex="cell.hex" :ink="cell.ink" />`.
- **`advanced.vue`**:
  - Replace header theme toggle with `<ThemeToggle />`.
  - Replace header favorites drawer with `<FavoritesDrawer @select="selectFavorite" />`.
  - Replace `.adv-swatch` elements with `<SwatchCard :role="item.role" :hex="item.hex" compact />`.

---

## 4. Verification Plan

1. **RED**: Write component tests in `tests/components/` and verify they fail (Red).
2. **GREEN**: Implement `uno.config.ts` and components until all tests pass (Green).
3. **REFACTOR**: Refactor `index.vue` and `advanced.vue` to consume components and verify `pnpm typecheck` and `pnpm build` succeed cleanly.
