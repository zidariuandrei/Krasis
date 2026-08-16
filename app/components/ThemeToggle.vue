<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
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
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--line, rgba(0, 0, 0, 0.15));
  border-radius: 999px;
  background: transparent;
  color: var(--muted, #666);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.theme-toggle:hover {
  color: var(--ink, #111);
  border-color: var(--ink, #111);
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
</style>
