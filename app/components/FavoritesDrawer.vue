<script setup lang="ts">
import { ref } from 'vue'
import { useFavorites, type Favorite } from '../composables/useFavorites'

const emit = defineEmits<{
  (e: 'select', fav: Favorite): void
}>()

const { favorites, removeFavorite } = useFavorites()
const isOpen = ref(false)

const handleSelect = (fav: Favorite) => {
  emit('select', fav)
  isOpen.value = false
}

const handleRemove = (id: number) => {
  removeFavorite(id)
}
</script>

<template>
  <div v-if="favorites.length" class="favorites-dropdown">
    <button
      class="favorites-toggle"
      type="button"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
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

    <template v-if="isOpen">
      <div class="dropdown-scrim" @click="isOpen = false"></div>
      <div class="favorites-menu" role="menu">
        <div
          v-for="fav in favorites"
          :key="fav.id"
          class="favorites-menu-item"
        >
          <button
            class="menu-main"
            type="button"
            :aria-label="`View saved palette`"
            @click="handleSelect(fav)"
          >
            <span class="chip-swatches">
              <span
                v-for="(cell, idx) in fav.cells"
                :key="idx"
                class="chip-swatch"
                :style="{ backgroundColor: cell.hex }"
              ></span>
            </span>
          </button>
          <button
            class="chip-remove"
            type="button"
            :aria-label="`Remove favorite ${fav.id}`"
            @click="handleRemove(fav.id)"
          >
            ×
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
  border: 1px solid var(--line, rgba(0, 0, 0, 0.15));
  border-radius: 999px;
  background: transparent;
  color: var(--ink, #111);
  font-family: var(--mono, monospace);
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
  border-color: var(--blue, #2e63a5);
  background: color-mix(in srgb, var(--blue, #2e63a5) 8%, transparent);
}

.favorites-icon {
  color: var(--muted, #666);
  transition: color 0.18s ease;
}

.favorites-toggle:hover .favorites-icon,
.favorites-toggle[aria-expanded="true"] .favorites-icon {
  color: var(--blue, #2e63a5);
}

.favorites-count {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 3px 5px 0;
  border-radius: 999px;
  background: var(--blue, #2e63a5);
  color: #fff;
  font-size: 0.56rem;
  font-weight: 600;
  line-height: 1;
}

.favorites-caret {
  display: inline-flex;
  color: var(--muted, #666);
  transition: transform 0.18s ease, color 0.18s ease;
}

.favorites-toggle:hover .favorites-caret,
.favorites-toggle[aria-expanded="true"] .favorites-caret {
  color: var(--blue, #2e63a5);
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
  border: 1px solid var(--line, rgba(0, 0, 0, 0.15));
  border-radius: 14px;
  background: var(--paper, #ffffff);
  box-shadow: 0 16px 40px rgba(8, 20, 38, 0.24);
  scrollbar-width: thin;
  transform-origin: top left;
  animation: favorites-pop 0.16s ease;
}

:global(.theme-dark) .favorites-menu {
  background: var(--card-bg, #181b21);
  border-color: var(--line, rgba(255, 255, 255, 0.15));
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
  border-radius: 999px;
  transition: background-color 0.15s ease;
}

.favorites-menu-item:hover {
  background: color-mix(in srgb, var(--blue, #2e63a5) 10%, transparent);
}

.menu-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted, #666);
  font-family: var(--mono, monospace);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
}

.chip-swatches {
  display: inline-flex;
  align-items: center;
  height: 16px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex: 1 1 auto;
}

.chip-swatch {
  flex: 1 1 0;
  width: auto;
  min-width: 0;
  height: 16px;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted, #666);
  font-size: 0.88rem;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.chip-remove:hover {
  color: var(--red, #d93838);
  background: color-mix(in srgb, var(--red, #d93838) 12%, transparent);
}
</style>
