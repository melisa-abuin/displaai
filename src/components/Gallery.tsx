import { useCallback, useMemo, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { thumbnailUrl, type DriveFolder, type DrivePhoto } from '../drive/api'
import { usePhotos } from '../drive/hooks'
import { formatNumber } from '../format'
import { Lightbox } from './Lightbox'
import styles from './Gallery.module.css'

const MIN_TILE = 180
const GAP = 8
const DEFAULT_COLUMNS = 4

interface PhotoEntry {
  key: string
  photo: DrivePhoto
}

/** The photos of one folder; `folderId` is unset when listing everything mixed. */
interface Section {
  folderId?: string
  photos: PhotoEntry[]
}

// The virtualized list is flat: a section is its header followed by its rows of tiles.
type ListItem =
  | { kind: 'header'; key: string; folderId: string; isFirst: boolean }
  | { kind: 'row'; key: string; entries: PhotoEntry[] }

function SectionHeader({
  title,
  path,
  count,
  isCollapsed,
  isFirst,
  onToggle,
}: {
  title: string
  path?: string
  count?: number
  isCollapsed: boolean
  isFirst: boolean
  onToggle: () => void
}) {
  const split = title.lastIndexOf(' / ')
  const parents = split === -1 ? '' : title.slice(0, split + 3)
  const name = title.slice(parents.length)
  return (
    <div
      className={`${styles.headerRow} ${isFirst ? styles.firstHeaderRow : ''}`}
    >
      <h3 className={styles.folderHeader} title={path}>
        <button
          type="button"
          className={styles.folderToggle}
          aria-expanded={!isCollapsed}
          onClick={onToggle}
        >
          <span
            className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}
            aria-hidden="true"
          />
          <span className={styles.folderName}>
            {parents}
            <span className={styles.folderLeaf}>{name}</span>
          </span>
          {count !== undefined && (
            <span className={styles.folderCount}>{formatNumber(count)}</span>
          )}
        </button>
      </h3>
    </div>
  )
}

function PhotoRow({
  entries,
  columns,
  onSelect,
}: {
  entries: PhotoEntry[]
  columns: number
  onSelect: (photoId: string) => void
}) {
  return (
    <div
      className={styles.row}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {entries.map(({ key, photo }) => (
        <button
          key={key}
          type="button"
          className={styles.tile}
          onClick={() => onSelect(photo.id)}
          aria-label={photo.name}
        >
          {thumbnailUrl(photo) ? (
            <img
              src={thumbnailUrl(photo)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={styles.noThumb}>{photo.name}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** How many tiles of at least MIN_TILE fit across the element, kept up to date on resize. */
function useColumns() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const width = element.clientWidth
      if (width > 0)
        setColumns(Math.max(1, Math.floor((width + GAP) / (MIN_TILE + GAP))))
    }
    update()
    observer.current = new ResizeObserver(update)
    observer.current.observe(element)
  }, [])
  return [ref, columns] as const
}

export function Gallery({
  token,
  folderIds,
  grouped,
  folders,
  rootPath,
}: {
  token: string
  folderIds: readonly string[]
  /** Show one section per folder, with its name, instead of one mixed list. */
  grouped: boolean
  folders?: ReadonlyMap<string, DriveFolder>
  /** Path of the opened folder; section titles show the path below it. */
  rootPath?: string
}) {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotos(token, folderIds, grouped)
  const [selected, setSelected] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [containerRef, columns] = useColumns()

  const showHeaders = grouped && folderIds.length > 1
  const sections = useMemo(() => {
    const result: Section[] = []
    for (const page of data?.pages ?? []) {
      if (page.files.length === 0) continue
      const folderId = showHeaders ? page.folderId : undefined
      let section = result.at(-1)
      if (!section || section.folderId !== folderId) {
        section = { folderId, photos: [] }
        result.push(section)
      }
      for (const photo of page.files)
        section.photos.push({ key: `${page.folderId ?? ''}:${photo.id}`, photo })
    }
    return result
  }, [data, showHeaders])

  // Rows rather than single tiles: a grid can't mix full-width section headers with tiles.
  const items = useMemo(() => {
    const result: ListItem[] = []
    for (const section of sections) {
      const { folderId } = section
      if (folderId)
        result.push({
          kind: 'header',
          key: `header:${folderId}`,
          folderId,
          isFirst: result.length === 0,
        })
      if (folderId && collapsed.has(folderId)) continue
      for (let i = 0; i < section.photos.length; i += columns) {
        const entries = section.photos.slice(i, i + columns)
        result.push({ kind: 'row', key: entries[0].key, entries })
      }
    }
    return result
  }, [sections, collapsed, columns])
  const toggle = useCallback((folderId: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(folderId)) next.add(folderId)
      return next
    })
  }, [])

  if (isLoading) return <p className={styles.status}>Loading photos&hellip;</p>
  if (error)
    return (
      <p role="alert" className={styles.status}>
        Could not load photos.
      </p>
    )

  const selectedPhoto = data?.pages
    .flatMap((page) => page.files)
    .find((photo) => photo.id === selected)
  if (sections.length === 0)
    return <p className={styles.status}>No photos in the connected folders.</p>

  return (
    <div ref={containerRef}>
      <Virtuoso
        useWindowScroll
        data={items}
        increaseViewportBy={800}
        computeItemKey={(_, item) => item.key}
        endReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        itemContent={(_, item) => {
          if (item.kind === 'row')
            return (
              <PhotoRow
                entries={item.entries}
                columns={columns}
                onSelect={setSelected}
              />
            )
          const folder = folders?.get(item.folderId)
          const prefix = rootPath ? `${rootPath} / ` : undefined
          const title =
            prefix && folder?.path.startsWith(prefix)
              ? folder.path.slice(prefix.length)
              : folder?.name
          return (
            <SectionHeader
              title={title ?? 'Unknown folder'}
              path={folder?.path}
              count={folder?.photoCount}
              isCollapsed={collapsed.has(item.folderId)}
              isFirst={item.isFirst}
              onToggle={() => toggle(item.folderId)}
            />
          )
        }}
      />
      {isFetchingNextPage && (
        <p className={styles.status} aria-live="polite">
          Loading&hellip;
        </p>
      )}
      {selectedPhoto && (
        <Lightbox
          token={token}
          photo={selectedPhoto}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
