// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    server: {
      allowedHosts: ['cachyos-x8664.tail2a58ea.ts.net']
    }
  },
  nitro: {
    preset: 'cloudflare_module'
  }
})
