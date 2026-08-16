import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetWebFonts,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno({
      dark: {
        dark: '.theme-dark',
      },
    }),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetWebFonts({
      fonts: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }),
  ],
  theme: {
    colors: {
      surface: {
        base: 'var(--bg-color, #0f1115)',
        elevated: 'var(--card-bg, #181b21)',
      },
      border: {
        subtle: 'var(--border-color, rgba(255, 255, 255, 0.1))',
      },
      text: {
        main: 'var(--text-color, #f0f2f5)',
        subtle: 'var(--text-muted, #8a909a)',
      },
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },
  },
  shortcuts: {
    'btn-icon': 'inline-flex items-center justify-center p-2 rounded-md transition-colors hover:bg-white/10 active:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary/50',
    'card-surface': 'rounded-xl border border-border-subtle bg-surface-elevated shadow-md p-4',
    'chip-badge': 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border border-border-subtle bg-surface-base transition-all hover:border-white/30',
    'drawer-panel': 'absolute z-50 rounded-xl border border-border-subtle bg-surface-elevated shadow-xl p-3 backdrop-blur-md',
  },
})
