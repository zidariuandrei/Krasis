<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  script: [
    {
      // Apply the saved theme to <html> before first paint to avoid a flash.
      innerHTML: `(() => { try { var cookies = document.cookie.split(';'); var cookieTheme = null; for (var i = 0; i < cookies.length; i++) { var c = cookies[i].trim(); if (c.indexOf('krasis-theme=') === 0) { cookieTheme = c.substring(13); break; } } var s = cookieTheme || localStorage.getItem('krasis-theme'); var d = s === 'dark' || (s === null && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('theme-dark', !!d); } catch (e) {} })();`,
      tagPosition: 'head',
    },
  ],
})
</script>

<template>
  <NuxtPage />
</template>
