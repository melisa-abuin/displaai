import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'drive-photos:connected-folders'

export interface ConnectedFolder {
  id: string
  /** Also show everything inside the folder's subfolders. */
  recursive: boolean
}

const EMPTY: readonly ConnectedFolder[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedValue: readonly ConnectedFolder[] = EMPTY

function parse(raw: string | null): readonly ConnectedFolder[] {
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY
    const entries: ConnectedFolder[] = []
    for (const item of parsed) {
      // Plain strings come from the first version, which had no subfolder option.
      if (typeof item === 'string') entries.push({ id: item, recursive: false })
      else if (item && typeof item.id === 'string')
        entries.push({ id: item.id, recursive: item.recursive === true })
    }
    return entries
  } catch {
    return EMPTY
  }
}

function read(): readonly ConnectedFolder[] {
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

function write(entries: readonly ConnectedFolder[]) {
  const raw = JSON.stringify(entries)
  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    cachedRaw = raw
    cachedValue = entries
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

/** The folders the user chose to show in the app, persisted locally. */
export function useConnectedFolders() {
  const entries = useSyncExternalStore(subscribe, read)

  /** `null` disconnects the folder; otherwise it is connected with that mode. */
  const setFolder = useCallback((id: string, recursive: boolean | null) => {
    const rest = read().filter((entry) => entry.id !== id)
    write(recursive === null ? rest : [...rest, { id, recursive }])
  }, [])

  const clear = useCallback(() => write([]), [])

  return { entries, setFolder, clear }
}
