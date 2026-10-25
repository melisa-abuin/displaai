import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { TagFilter } from './drive/tagFilter'

const NAVIGATE_EVENT = 'app:navigate'

export type Route =
  | { name: 'gallery' }
  | { name: 'album'; folderId: string }
  | { name: 'view'; viewId: string }
  | { name: 'views'; viewId?: string }
  | { name: 'map' }
  | { name: 'settings' }
  | { name: 'folders'; path: string[] }
  | { name: 'notFound' }

const FOLDERS_PATH = '/settings/folders'
const VIEWS_PATH = '/settings/views'

export const paths = {
  gallery: '/',
  album: (folderId: string) => `/albums/${encodeURIComponent(folderId)}`,
  settings: '/settings',
  map: '/map',
  view: (viewId: string) => `/views/${encodeURIComponent(viewId)}`,
  views: VIEWS_PATH,
  editView: (viewId: string) => `/settings/views/${encodeURIComponent(viewId)}`,
  folders: FOLDERS_PATH,
  /** The folder manager opened at the subfolder reached via these folder ids. */
  foldersAt: (folderIds: readonly string[]) =>
    [FOLDERS_PATH, ...folderIds.map(encodeURIComponent)].join('/'),
}

export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'gallery' }
  if (parts.length === 1 && parts[0] === 'settings') return { name: 'settings' }
  if (parts.length === 1 && parts[0] === 'map') return { name: 'map' }
  if (parts[0] === 'settings' && parts[1] === 'folders') {
    try {
      return { name: 'folders', path: parts.slice(2).map(decodeURIComponent) }
    } catch {
      return { name: 'notFound' }
    }
  }
  if (parts[0] === 'settings' && parts[1] === 'views' && parts.length <= 3) {
    try {
      return { name: 'views', viewId: parts[2] && decodeURIComponent(parts[2]) }
    } catch {
      return { name: 'notFound' }
    }
  }
  if (parts.length === 2 && parts[0] === 'views') {
    try {
      return { name: 'view', viewId: decodeURIComponent(parts[1]) }
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

const getSearch = () => window.location.search

/** Navigates to an app path; the query string (the filters) is dropped unless `to` has its own. */
export function useNavigate() {
  return useCallback((to: string, options?: { replace?: boolean }) => {
    if (to === getPathname() + getSearch()) return
    const url = basePath + to
    if (options?.replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    window.dispatchEvent(new Event(NAVIGATE_EVENT))
  }, [])
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname)
}

const TAG_PARAM = 'tag'
const EXCLUDE_PARAM = 'not'
const MATCH_PARAM = 'match'
const NO_TAGS: readonly string[] = []

/** Updates the filter parameters in place, leaving the path and history length alone. */
function updateSearch(change: (params: URLSearchParams) => void) {
  const params = new URLSearchParams(getSearch())
  change(params)
  const search = params.toString()
  const url = `${basePath}${getPathname()}${search ? `?${search}` : ''}${window.location.hash}`
  if (url === basePath + getPathname() + getSearch() + window.location.hash)
    return
  window.history.replaceState(null, '', url)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

/** The sidebar tag filter, kept in the URL as `?tag=a&tag=b&not=c&match=all`. */
export function useFilters() {
  const search = useSyncExternalStore(subscribe, getSearch)
  const filter = useMemo<TagFilter>(() => {
    const params = new URLSearchParams(search)
    const tags = [...new Set(params.getAll(TAG_PARAM).filter(Boolean))]
    const exclude = [
      ...new Set(
        params.getAll(EXCLUDE_PARAM).filter((t) => t && !tags.includes(t)),
      ),
    ]
    return {
      tags: tags.length > 0 ? tags : NO_TAGS,
      exclude: exclude.length > 0 ? exclude : NO_TAGS,
      match: params.get(MATCH_PARAM) === 'all' ? 'all' : 'any',
    }
  }, [search])

  const setFilter = useCallback((next: TagFilter) => {
    updateSearch((params) => {
      params.delete(TAG_PARAM)
      params.delete(EXCLUDE_PARAM)
      for (const tag of next.tags) params.append(TAG_PARAM, tag)
      for (const tag of next.exclude) params.append(EXCLUDE_PARAM, tag)
      if (next.tags.length > 1 && next.match === 'all')
        params.set(MATCH_PARAM, 'all')
      else params.delete(MATCH_PARAM)
    })
  }, [])

  return [filter, setFilter] as const
}
