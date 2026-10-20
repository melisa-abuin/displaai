import { useCallback, useSyncExternalStore } from 'react'

const NAVIGATE_EVENT = 'app:navigate'

export type Route =
  | { name: 'gallery' }
  | { name: 'album'; folderId: string }
  | { name: 'settings' }
  | { name: 'folders'; path: string[] }
  | { name: 'notFound' }

const FOLDERS_PATH = '/settings/folders'

export const paths = {
  gallery: '/',
  album: (folderId: string) => `/albums/${encodeURIComponent(folderId)}`,
  settings: '/settings',
  folders: FOLDERS_PATH,
  /** The folder manager opened at the subfolder reached via these folder ids. */
  foldersAt: (folderIds: readonly string[]) =>
    [FOLDERS_PATH, ...folderIds.map(encodeURIComponent)].join('/'),
}

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'gallery' }
  if (parts.length === 1 && parts[0] === 'settings') return { name: 'settings' }
  if (parts[0] === 'settings' && parts[1] === 'folders') {
    try {
      return { name: 'folders', path: parts.slice(2).map(decodeURIComponent) }
    } catch {
      return { name: 'notFound' }
    }
  }
  if (parts.length === 2 && parts[0] === 'albums') {
    try {
      return { name: 'album', folderId: decodeURIComponent(parts[1]) }
    } catch {
      return { name: 'notFound' }
    }
  }
  return { name: 'notFound' }
}

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener(NAVIGATE_EVENT, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(NAVIGATE_EVENT, listener)
  }
}

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** The app route path: `location.pathname` without the deploy base (e.g. `/repo` on GitHub Pages). */
const getPathname = () => {
  const { pathname } = window.location
  if (
    basePath &&
    (pathname === basePath || pathname.startsWith(`${basePath}/`))
  ) {
    return pathname.slice(basePath.length) || '/'
  }
  return pathname
}

export function useNavigate() {
  return useCallback((to: string, options?: { replace?: boolean }) => {
    if (to === getPathname()) return
    const url = basePath + to
    if (options?.replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    window.dispatchEvent(new Event(NAVIGATE_EVENT))
  }, [])
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname)
}
