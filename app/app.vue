<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  script: [
    {
      // Apply the saved theme to <html> before first paint to avoid a flash.
      innerHTML: `(() => { try { var s = localStorage.getItem('krasis-theme'); var d = s === 'dark' || (s === null && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('theme-dark', !!d); } catch (e) {} })();`,
      tagPosition: 'head',
    },
  ],
})
</script>

<template>
  <NuxtPage />
</template>
