import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_SORT, isSortOrder, type SortOrder } from './photoSort'

const LOCAL_AI_KEY = 'drive-photos:local-ai'
const SORT_KEY = 'drive-photos:sort'

const listeners = new Set<() => void>()
// Used when localStorage is unavailable, so settings still last for the session.
const fallback = new Map<string, string>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return fallback.get(key) ?? null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    fallback.set(key, value)
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** Whether the on-device AI scanning features are turned on, persisted locally. Off by default. */
export function useLocalAi() {
  const enabled =
    useSyncExternalStore(subscribe, () => read(LOCAL_AI_KEY)) === 'true'
  const setEnabled = useCallback(
    (value: boolean) => write(LOCAL_AI_KEY, String(value)),
    [],
  )
  return [enabled, setEnabled] as const
}

/** How the gallery orders photos, persisted locally. */
export function useGallerySort() {
  const stored = useSyncExternalStore(subscribe, () => read(SORT_KEY))
  const sort: SortOrder = isSortOrder(stored) ? stored : DEFAULT_SORT
  const setSort = useCallback((value: SortOrder) => write(SORT_KEY, value), [])
  return [sort, setSort] as const
}
