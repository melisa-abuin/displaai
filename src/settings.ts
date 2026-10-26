import { useCallback, useSyncExternalStore } from 'react'
import {
    DEFAULT_MEDIA_KINDS,
    isMediaKind,
    MEDIA_KINDS,
    type MediaKind,
} from './mediaKind'
import { DEFAULT_SORT, isSortOrder, type SortOrder } from './photoSort'

const LOCAL_AI_KEY = 'drive-photos:local-ai'
const SORT_KEY = 'drive-photos:sort'
const MEDIA_KINDS_KEY = 'drive-photos:media-kinds'
const TIMELINE_KEY = 'drive-photos:timeline'

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

/** Whether the gallery's time scrubber is shown, persisted locally. On by default. */
export function useTimeline() {
  const visible =
    useSyncExternalStore(subscribe, () => read(TIMELINE_KEY)) !== 'false'
  const setVisible = useCallback(
    (value: boolean) => write(TIMELINE_KEY, String(value)),
    [],
  )
  return [visible, setVisible] as const
}

/** Called whenever any setting changes; returns the unsubscribe function. */
export const subscribeSettings = subscribe

let parsedKinds:
  { raw: string | null; kinds: ReadonlySet<MediaKind> } | undefined

/** The media types to show, from their stored form; images only when nothing valid is stored. */
function parseMediaKinds(raw: string | null): ReadonlySet<MediaKind> {
  if (parsedKinds?.raw === raw) return parsedKinds.kinds
  let list: unknown
  try {
    list = raw ? JSON.parse(raw) : undefined
  } catch {
    list = undefined
  }
  const valid = Array.isArray(list) ? list.filter(isMediaKind) : []
  const kinds = new Set<MediaKind>(valid.length ? valid : DEFAULT_MEDIA_KINDS)
  parsedKinds = { raw, kinds }
  return kinds
}

/** The media types currently shown, for code outside React. */
export function getMediaKinds(): ReadonlySet<MediaKind> {
  return parseMediaKinds(read(MEDIA_KINDS_KEY))
}

/** Which media types (images, GIFs, videos) the app shows, persisted locally. Images only by default. */
export function useMediaKinds() {
  const kinds = parseMediaKinds(
    useSyncExternalStore(subscribe, () => read(MEDIA_KINDS_KEY)),
  )
  const setKinds = useCallback((value: ReadonlySet<MediaKind>) => {
    const ordered = MEDIA_KINDS.map((kind) => kind.value).filter((kind) =>
      value.has(kind),
    )
    write(MEDIA_KINDS_KEY, JSON.stringify(ordered))
  }, [])
  return [kinds, setKinds] as const
}
