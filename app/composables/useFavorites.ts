export type FavoriteCell = { role: string; hex: string }
export type Favorite = {
  id: number
  sig: string
  center: { x: number; y: number }
  cells: FavoriteCell[]
}

const FAVORITES_KEY = 'krasis-favorites'

const getInitialFavorites = (): Favorite[] => {
  if (import.meta.client && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as Favorite[]
      }
    } catch {}
  }
  return []
}

export const useFavorites = () => {
  const favorites = useState<Favorite[]>('favorites', () => getInitialFavorites())

  // Preset favorites synchronously on setup before initial render
  if (import.meta.client && favorites.value.length === 0) {
    const loaded = getInitialFavorites()
    if (loaded.length > 0) {
      favorites.value = loaded
    }
  }

  const loadFavorites = (): Favorite[] => getInitialFavorites()

  const persistFavorites = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
    }
  }

  const removeFavorite = (id: number) => {
    favorites.value = favorites.value.filter((favorite) => favorite.id !== id)
    persistFavorites()
  }

  const addFavorite = (entry: { sig: string; center: { x: number; y: number }; cells: FavoriteCell[] }) => {
    const existing = favorites.value.find((fav) => fav.sig === entry.sig)
    if (existing) {
      removeFavorite(existing.id)
      return false // removed
    }
    favorites.value = [
      { id: Date.now(), sig: entry.sig, center: entry.center, cells: entry.cells },
      ...favorites.value,
    ]
    persistFavorites()
    return true // added
  }

  const isFavorited = (sig: string) => {
    return favorites.value.some((fav) => fav.sig === sig)
  }

  return {
    favorites,
    loadFavorites,
    persistFavorites,
    removeFavorite,
    addFavorite,
    isFavorited,
  }
}
