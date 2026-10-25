import { useCallback, useSyncExternalStore } from 'react'
import type { TagMatch } from './tagFilter'

const STORAGE_KEY = 'drive-photos:views'

export interface ViewFolder {
  id: string
  /** Also include everything inside the folder's subfolders. */
  recursive: boolean
}

/** A saved gallery: photos from some folders (all connected ones if none), narrowed by tags. */
export interface CustomView {
  id: string
  name: string
  folders: ViewFolder[]
  tags: string[]
  exclude: string[]
  match: TagMatch
}

const EMPTY: readonly CustomView[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedValue: readonly CustomView[] = EMPTY

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

function parse(raw: string | null): readonly CustomView[] {
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY
    const views: CustomView[] = []
    for (const item of parsed) {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string')
        continue
      views.push({
        id: item.id,
        name: item.name,
        folders: Array.isArray(item.folders)
          ? item.folders.flatMap((f: { id?: unknown; recursive?: unknown }) =>
              typeof f?.id === 'string'
                ? [{ id: f.id, recursive: f.recursive === true }]
                : [],
            )
          : [],
        tags: strings(item.tags),
        exclude: strings(item.exclude),
        match: item.match === 'all' ? 'all' : 'any',
      })
    }
    return views
  } catch {
    return EMPTY
  }
}

function read(): readonly CustomView[] {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return cachedValue
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parse(raw)
  }
  return cachedValue
}

function write(views: readonly CustomView[]) {
  const raw = JSON.stringify(views)
  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    cachedRaw = raw
    cachedValue = views
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

/** The custom views shown in the sidebar, persisted locally. */
export function useViews() {
  const views = useSyncExternalStore(subscribe, read)

  /** Adds the view, or replaces the one with the same id. */
  const saveView = useCallback((view: CustomView) => {
    const current = read()
    write(
      current.some((v) => v.id === view.id)
        ? current.map((v) => (v.id === view.id ? view : v))
        : [...current, view],
    )
  }, [])

  const removeView = useCallback(
    (id: string) => write(read().filter((v) => v.id !== id)),
    [],
  )

  return { views, saveView, removeView }
}

export function newViewId(): string {
  return Math.random().toString(36).slice(2, 10)
}
