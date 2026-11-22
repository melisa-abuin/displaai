const listeners = new Set<() => void>()
// Used when localStorage is unavailable, so settings still last for the session.
const fallback = new Map<string, string>()

export function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return fallback.get(key) ?? null
  }
}

export function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    fallback.set(key, value)
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}
