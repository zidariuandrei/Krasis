import { nextTick, watch } from 'vue'

export const useTheme = () => {
  const themeCookie = useCookie<'light' | 'dark'>('krasis-theme', {
    default: () => 'light',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const getInitialTheme = (): 'light' | 'dark' => {
    if (import.meta.client && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('krasis-theme')
      if (saved === 'dark' || saved === 'light') {
        return saved
      }
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return themeCookie.value || 'light'
  }

  const theme = useState<'light' | 'dark'>('theme', () => getInitialTheme())

  const syncThemeToDom = (value: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('theme-dark', value === 'dark')
    }
  }

  // Preset state immediately during setup before initial render
  if (import.meta.client) {
    const initial = getInitialTheme()
    if (theme.value !== initial) {
      theme.value = initial
    }
    themeCookie.value = theme.value
    syncThemeToDom(theme.value)
  }

  const setTheme = (value: 'light' | 'dark') => {
    theme.value = value
    themeCookie.value = value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('krasis-theme', value)
    }
    syncThemeToDom(value)
  }

  const toggleTheme = (event?: MouseEvent) => {
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
    const apply = () => {
      setTheme(nextTheme)
    }

    const doc = typeof document !== 'undefined' ? document : undefined
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsTransition =
      !!doc &&
      typeof (doc as unknown as { startViewTransition?: unknown }).startViewTransition === 'function'

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

    const transition = (
      doc as unknown as {
        startViewTransition: (cb: () => void | Promise<void>) => { ready: Promise<void> }
      }
    ).startViewTransition(() => {
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

  watch(theme, (value) => {
    themeCookie.value = value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('krasis-theme', value)
    }
    syncThemeToDom(value)
  })

  return {
    theme,
    toggleTheme,
    setTheme,
  }
}
