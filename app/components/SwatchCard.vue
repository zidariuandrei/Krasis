<script setup lang="ts">
const props = defineProps<{
  role: string
  hex: string
  ink?: string
  compact?: boolean
}>()
</script>

<template>
  <div
    v-if="compact"
    class="adv-swatch"
    :style="{ backgroundColor: props.hex }"
    :title="`${props.role} ${props.hex}`"
  >
    <span class="sr-only">{{ props.role }} {{ props.hex }}</span>
  </div>
  <div
    v-else
    class="swatch-card inspector-cell"
    :style="{ backgroundColor: props.hex, color: props.ink || 'inherit' }"
  >
    <span class="swatch-role">{{ props.role }}</span>
    <strong class="swatch-hex">{{ props.hex.toUpperCase() }}</strong>
  </div>
</template>

<style scoped>
.swatch-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  overflow: hidden;
  font-family: var(--mono, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.swatch-hex {
  font-size: 0.55rem;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.adv-swatch {
  position: relative;
  flex: 1 1 0;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--line, rgba(0, 0, 0, 0.15));
  box-sizing: border-box;
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
  border-width: 0;
}
</style>
