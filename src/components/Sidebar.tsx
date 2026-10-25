import { useState } from 'react'
import type { DriveFolder, TagCount } from '../drive/api'
import {
  cycleTag,
  tagState,
  type TagFilter,
  type TagMatch,
} from '../drive/tagFilter'
import { formatNumber } from '../format'
import styles from './Sidebar.module.css'

export interface SidebarView {
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
  isGalleryActive: boolean
  isLoading: boolean
  error: Error | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  email: string | null | undefined
  isSettingsOpen: boolean
  onOpenSettings: () => void
  isMapActive: boolean
  /** Photos with a location; unset until the library has loaded. */
  mapCount: number | undefined
  onOpenMap: () => void
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
  isGalleryActive,
  isLoading,
  error,
  selectedId,
  onSelect,
  email,
  isSettingsOpen,
  onOpenSettings,
  isMapActive,
  mapCount,
  onOpenMap,
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

  return (
    <aside className={styles.sidebar} aria-label="Albums">
      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}loog.png`}
          alt=""
        />
        <h1 className={styles.title} title="Drive Photos Visualizer">
          DPV
        </h1>
      </div>
      <nav className={styles.nav}>
        <button
          type="button"
          className={styles.item}
          aria-current={
            isGalleryActive && selectedId === null ? 'true' : undefined
          }
          onClick={() => onSelect(null)}
        >
          <span className={styles.name}>All photos</span>
          {allPhotosCount !== undefined && (
            <>
              {' '}
              <span className={styles.count}>
                {formatNumber(allPhotosCount)}
              </span>
            </>
          )}
        </button>
        {isLoading && <p className={styles.status}>Loading albums&hellip;</p>}
        {error && (
          <p role="alert" className={styles.status}>
            Could not load albums.
          </p>
        )}
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
                    isGalleryActive && selectedId === folder.id
                      ? 'true'
                      : undefined
                  }
                  onClick={() => onSelect(folder.id)}
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
            onClick={() => onSelectView(view.id)}
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
        <button
          type="button"
          className={styles.item}
          aria-current={isMapActive ? 'true' : undefined}
          onClick={onOpenMap}
        >
          <span className={styles.name}>Map</span>
          {mapCount !== undefined && (
            <>
              {' '}
              <span className={styles.count}>{formatNumber(mapCount)}</span>
            </>
          )}
        </button>
      </nav>
      {!isSettingsOpen && tags && tags.length > 0 && (
        <section className={styles.filters} aria-label="Filter by tag">
          <div className={styles.filtersHeader}>
            <h2 className={styles.filtersTitle}>Tags</h2>
            {selectedCount > 0 && (
              <button
                type="button"
                className={styles.clear}
                onClick={() =>
                  onFilterChange({ ...filter, tags: [], exclude: [] })
                }
              >
                Clear
              </button>
            )}
          </div>
          {filter.tags.length > 1 && (
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
        </section>
      )}
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
