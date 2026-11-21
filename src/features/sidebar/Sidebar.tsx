import { useEffect, useState, useSyncExternalStore } from 'react'
import type {
  DriveFolder,
  TagCount,
  TagMatch,
  TagFilter,
} from '../../interfaces'
import { cycleTag, tagState } from '../../drive/tagFilter'
import { formatNumber } from '../../lib/format'
import styles from './Sidebar.module.css'
import { ICON_PROPS } from '../../ui/constants'
import { GEAR_PATH, MOBILE_QUERY } from './constants'

function subscribeMobile(listener: () => void) {
  const query = window.matchMedia?.(MOBILE_QUERY)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

const getIsMobile = () => window.matchMedia?.(MOBILE_QUERY).matches ?? false

/** Whether the screen is narrow enough for the bottom bar instead of the sidebar. */
function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getIsMobile)
}

interface SidebarView {
  id: string
  name: string
  /** Photos the view shows; unset until the library has loaded. */
  count: number | undefined
}

export interface SidebarAlbum {
  folder: DriveFolder
  /** 0 for connected folders; subfolders are nested beneath them. */
  depth: number
}

/** The ids of the folders containing `id`, from the nearest outwards. */
function ancestorIds(albums: SidebarAlbum[], id: string): string[] {
  const index = albums.findIndex((album) => album.folder.id === id)
  if (index < 0) return []
  const ids: string[] = []
  let depth = albums[index].depth
  for (let i = index - 1; i >= 0 && depth > 0; i--) {
    if (albums[i].depth < depth) {
      depth = albums[i].depth
      ids.push(albums[i].folder.id)
    }
  }
  return ids
}

/** The albums not hidden inside a collapsed folder. */
function visibleAlbums(albums: SidebarAlbum[], expanded: ReadonlySet<string>) {
  const result: { album: SidebarAlbum; hasChildren: boolean }[] = []
  let hiddenBelow = Infinity
  albums.forEach((album, i) => {
    if (album.depth > hiddenBelow) return
    hiddenBelow = Infinity
    const hasChildren = (albums[i + 1]?.depth ?? 0) > album.depth
    result.push({ album, hasChildren })
    if (hasChildren && !expanded.has(album.folder.id)) hiddenBelow = album.depth
  })
  return result
}

interface SidebarProps {
  albums: SidebarAlbum[] | undefined
  allPhotosCount: number | undefined
  isBrowseActive: boolean
  isLoading: boolean
  error: Error | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  email: string | null | undefined
  isSettingsOpen: boolean
  onOpenSettings: () => void
  /** Whether the folders show as a photo grid or on the map. */
  mode: 'photos' | 'map'
  onModeChange: (mode: 'photos' | 'map') => void
  tags: TagCount[] | undefined
  filter: TagFilter
  onFilterChange: (filter: TagFilter) => void
  views: readonly SidebarView[]
  selectedViewId: string | null
  onSelectView: (id: string) => void
}

export function Sidebar({
  albums,
  allPhotosCount,
  isBrowseActive,
  isLoading,
  error,
  selectedId,
  onSelect,
  email,
  isSettingsOpen,
  onOpenSettings,
  mode,
  onModeChange,
  tags,
  filter,
  onFilterChange,
  views,
  selectedViewId,
  onSelectView,
}: SidebarProps) {
  const selectedCount = filter.tags.length + filter.exclude.length
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(true)
  const isDrawerOpen = isMobile && drawerOpen

  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDrawerOpen])

  // Open the parents of the selected folder so it is never hidden.
  if (selectedId !== revealedId && albums) {
    setRevealedId(selectedId)
    if (selectedId !== null) {
      const parents = ancestorIds(albums, selectedId)
      if (parents.some((id) => !expanded.has(id)))
        setExpanded(new Set([...expanded, ...parents]))
    }
  }

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (!next.delete(id)) next.add(id)
    setExpanded(next)
  }

  const pickFolder = (id: string | null) => {
    setDrawerOpen(false)
    onSelect(id)
  }
  const pickView = (id: string) => {
    setDrawerOpen(false)
    onSelectView(id)
  }

  const status = (
    <>
      {isLoading && <p className={styles.status}>Loading albums&hellip;</p>}
      {error && (
        <p role="alert" className={styles.status}>
          Could not load albums.
        </p>
      )}
    </>
  )

  const allItem = (
    <button
      type="button"
      className={styles.item}
      aria-current={
        isBrowseActive && selectedId === null && selectedViewId === null
          ? 'true'
          : undefined
      }
      onClick={() => pickFolder(null)}
    >
      <span className={styles.name}>All folders</span>
      {allPhotosCount !== undefined && (
        <>
          {' '}
          <span className={styles.count}>{formatNumber(allPhotosCount)}</span>
        </>
      )}
    </button>
  )

  const folderList = (
    <>
      {albums &&
        visibleAlbums(albums, expanded).map(({ album, hasChildren }) => {
          const { folder, depth } = album
          const isOpen = expanded.has(folder.id)
          return (
            <div
              key={folder.id}
              className={styles.row}
              style={{ paddingLeft: `${depth * 14}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.toggle}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`}
                  onClick={() => toggle(folder.id)}
                >
                  <svg
                    className={isOpen ? styles.chevronOpen : undefined}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ) : (
                <span className={styles.toggle} aria-hidden="true" />
              )}
              <button
                type="button"
                className={styles.item}
                title={folder.path}
                aria-current={
                  isBrowseActive && selectedId === folder.id
                    ? 'true'
                    : undefined
                }
                onClick={() => pickFolder(folder.id)}
              >
                <span className={styles.name}>{folder.name}</span>{' '}
                <span className={styles.count}>
                  {formatNumber(folder.photoCount)}
                </span>
              </button>
            </div>
          )
        })}
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className={styles.item}
          aria-current={selectedViewId === view.id ? 'true' : undefined}
          onClick={() => pickView(view.id)}
        >
          <span className={styles.name}>{view.name}</span>
          {view.count !== undefined && (
            <>
              {' '}
              <span className={styles.count}>{formatNumber(view.count)}</span>
            </>
          )}
        </button>
      ))}
    </>
  )

  const tagFilters = !isSettingsOpen && tags && tags.length > 0 && (
    <section className={styles.filters} aria-label="Filter by tag">
      <div className={styles.filtersHeader}>
        <h2 className={styles.filtersTitle}>
          <button
            type="button"
            className={styles.filtersToggle}
            aria-expanded={tagsOpen}
            onClick={() => setTagsOpen(!tagsOpen)}
          >
            <svg
              className={tagsOpen ? styles.chevronOpen : undefined}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            Tags
          </button>
        </h2>
        {selectedCount > 0 && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onFilterChange({ ...filter, tags: [], exclude: [] })}
          >
            Clear
          </button>
        )}
      </div>
      {tagsOpen && filter.tags.length > 1 && (
        <div className={styles.match} role="group" aria-label="Match">
          {(['any', 'all'] as const).map((value: TagMatch) => (
            <button
              key={value}
              type="button"
              className={styles.matchOption}
              aria-pressed={filter.match === value}
              onClick={() => onFilterChange({ ...filter, match: value })}
            >
              {value === 'any' ? 'Any' : 'All'}
            </button>
          ))}
        </div>
      )}
      {tagsOpen && (
        <ul className={styles.tagList}>
          {tags.map((tag) => {
            const state = tagState(filter, tag.name)
            return (
              <li key={tag.name}>
                <button
                  type="button"
                  className={styles.tag}
                  aria-pressed={state === 'off' ? false : true}
                  data-state={state}
                  title={`${tag.name}${state === 'exclude' ? ' (excluded)' : ''}`}
                  onClick={() => onFilterChange(cycleTag(filter, tag.name))}
                >
                  <span className={styles.name}>
                    {state === 'exclude' ? 'Not ' : ''}
                    {tag.name}
                  </span>{' '}
                  <span className={styles.count}>
                    {formatNumber(tag.count)}
                  </span>
                </button>
              </li>
            )
          })}{' '}
        </ul>
      )}
    </section>
  )

  if (isMobile) {
    return (
      <>
        {isDrawerOpen && (
          <>
            <div
              className={styles.backdrop}
              aria-hidden="true"
              onClick={() => setDrawerOpen(false)}
            />
            <section
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Folders"
            >
              <div className={styles.drawerHeader}>
                <span className={styles.handle} aria-hidden="true" />
                <h2 className={styles.drawerTitle}>Folders</h2>
                <button
                  type="button"
                  className={styles.settingsButton}
                  aria-label="Close folders"
                  onClick={() => setDrawerOpen(false)}
                >
                  <svg {...ICON_PROPS} aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className={styles.nav}>
                {allItem}
                {status}
                {folderList}
              </nav>
              {tagFilters}
            </section>
          </>
        )}
        <nav className={styles.bottomBar} aria-label="Main">
          <button
            type="button"
            className={styles.tab}
            aria-label="Photos"
            title="Photos"
            aria-current={
              mode === 'photos' && !isSettingsOpen ? 'page' : undefined
            }
            onClick={() => {
              setDrawerOpen(false)
              onModeChange('photos')
            }}
          >
            <svg {...ICON_PROPS} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.tab}
            aria-label="Map"
            title="Map"
            aria-current={
              mode === 'map' && !isSettingsOpen ? 'page' : undefined
            }
            onClick={() => {
              setDrawerOpen(false)
              onModeChange('map')
            }}
          >
            <svg {...ICON_PROPS} aria-hidden="true">
              <path d="M14.1 5.9 9.9 3.8a2 2 0 0 0-1.8 0L3.6 6.1A1 1 0 0 0 3 7v12.4a1 1 0 0 0 1.4.9l3.7-1.9a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V4.6a1 1 0 0 0-1.4-.9l-3.7 1.9a2 2 0 0 1-1.8.3Z" />
              <path d="M15 5.8v15M9 3.2v15" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.tab}
            aria-label="Folders"
            title="Folders"
            aria-expanded={isDrawerOpen}
            onClick={() => setDrawerOpen(!isDrawerOpen)}
          >
            <svg {...ICON_PROPS} aria-hidden="true">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.tab}
            aria-label="Settings"
            title="Settings"
            aria-current={isSettingsOpen ? 'page' : undefined}
            onClick={() => {
              setDrawerOpen(false)
              onOpenSettings()
            }}
          >
            <svg {...ICON_PROPS} aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d={GEAR_PATH} />
            </svg>
          </button>
        </nav>
      </>
    )
  }

  return (
    <aside className={styles.sidebar} aria-label="Albums">
      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
        />
        <h1 className={styles.title}>Displaai</h1>
      </div>
      <div className={styles.mode} role="group" aria-label="View">
        {(['photos', 'map'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={styles.modeOption}
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
          >
            {value === 'photos' ? 'Photos' : 'Map'}
          </button>
        ))}
      </div>
      <nav className={styles.nav}>
        {allItem}
        {status}
        {folderList}
      </nav>

      {tagFilters}
      <div className={styles.account}>
        <span className={styles.email} title={email ?? undefined}>
          {email}
        </span>
        <button
          type="button"
          className={styles.settingsButton}
          aria-label="Settings"
          aria-current={isSettingsOpen ? 'page' : undefined}
          onClick={onOpenSettings}
        >
          <svg {...ICON_PROPS} width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d={GEAR_PATH} />
          </svg>
        </button>
      </div>
    </aside>
  )
}
