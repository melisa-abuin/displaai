import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { thumbnailUrl, type DriveFolder, type DrivePhoto } from '../drive/api'
import { usePhotos } from '../drive/hooks'
import { useFreshThumbnails } from '../drive/libraryStore'
import { isEmptyFilter, type TagFilter } from '../drive/tagFilter'
import { formatNumber } from '../format'
import { mediaKindOf } from '../mediaKind'
import { monthOf, SORT_OPTIONS, sortByDate } from '../photoSort'
import { useGallerySort, useTimeline } from '../settings'
import { Button } from './Button'
import { Dropdown } from './Dropdown'
import styles from './Gallery.module.css'
import { Lightbox } from './Lightbox'
import { TagEditor } from './TagEditor'
import { Timeline, type TimelineMonth } from './Timeline'

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
  | { kind: 'month'; key: string; label: string; isFirst: boolean }
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

const COLLAGE_SIZE = 4

/** Up to four of the selected photos as a mosaic, the last one showing how many more there are. */
function Collage({ photos }: { photos: DrivePhoto[] }) {
  const shown = useFreshThumbnails(photos.slice(0, COLLAGE_SIZE))
  const hidden = photos.length - shown.length
  return (
    <div className={styles.collage} aria-hidden="true">
      {shown.map((photo, i) => (
        <div key={photo.id} className={styles.collageTile}>
          {thumbnailUrl(photo) && (
            <img
              src={thumbnailUrl(photo)}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          {hidden > 0 && i === shown.length - 1 && (
            <span className={styles.collageMore}>+{formatNumber(hidden)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function BulkTagPanel({
  token,
  photos,
  total,
}: {
  token: string
  photos: DrivePhoto[]
  total: number
}) {
  return (
    <aside className={styles.panel} aria-label="Edit tags of selected photos">
      <Collage photos={photos} />
      <h3 className={styles.panelTitle}>
        {formatNumber(photos.length)} of {formatNumber(total)} selected
      </h3>
      <TagEditor token={token} photos={photos} />
    </aside>
  )
}

function PhotoRow({
  entries,
  columns,
  isSelecting,
  selectedIds,
  onSelect,
}: {
  entries: PhotoEntry[]
  columns: number
  isSelecting: boolean
  selectedIds: ReadonlySet<string>
  onSelect: (photoId: string) => void
}) {
  // Rows are only mounted while on screen, so only visible photos get refreshed.
  const photos = useFreshThumbnails(entries.map((entry) => entry.photo))
  return (
    <div
      className={styles.row}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {entries.map(({ key }, i) => {
        const photo = photos[i]
        const isSelected = isSelecting && selectedIds.has(photo.id)
        return (
          <button
            key={key}
            type="button"
            className={`${styles.tile} ${isSelected ? styles.tileSelected : ''}`}
            onClick={() => onSelect(photo.id)}
            aria-label={photo.name}
            aria-pressed={isSelecting ? isSelected : undefined}
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
            {mediaKindOf(photo) === 'videos' && (
              <span
                className={`${styles.videoBadge} ${isSelecting ? styles.videoBadgeSelecting : ''}`}
                aria-hidden="true"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4v16l13-8z" />
                </svg>
              </span>
            )}
            {isSelecting && (
              <span
                className={`${styles.check} ${isSelected ? styles.checkOn : ''}`}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
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
  filters,
  emptyMessage,
}: {
  token: string
  folderIds: readonly string[]
  /** Show one section per folder, with its name, instead of one mixed list. */
  grouped: boolean
  folders?: ReadonlyMap<string, DriveFolder>
  /** Path of the opened folder; section titles show the path below it. */
  rootPath?: string
  /** Only photos matching every one of these filters are shown. */
  filters?: readonly TagFilter[]
  /** Shown when there are no photos and no filter is narrowing them. */
  emptyMessage?: string
}) {
  const { data, isLoading, error } = usePhotos(folderIds, grouped, filters)
  const [selected, setSelected] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [containerRef, columns] = useColumns()
  const [sort, setSort] = useGallerySort()
  const [showTimeline] = useTimeline()
  const listRef = useRef<HTMLDivElement | null>(null)
  const virtuoso = useRef<VirtuosoHandle>(null)
  // The list's width (minus the timeline gutter) decides the column count.
  const listElement = useCallback(
    (element: HTMLDivElement | null) => {
      listRef.current = element
      containerRef(element)
    },
    [containerRef],
  )

  const showHeaders = grouped && folderIds.length > 1
  const sections = useMemo(() => {
    const result: Section[] = []
    for (const page of data.pages) {
      if (page.files.length === 0) continue
      const folderId = showHeaders ? page.folderId : undefined
      let section = result.at(-1)
      if (!section || section.folderId !== folderId) {
        section = { folderId, photos: [] }
        result.push(section)
      }
      for (const photo of page.files)
        section.photos.push({
          key: `${page.folderId ?? ''}:${photo.id}`,
          photo,
        })
    }
    return result
  }, [data.pages, showHeaders])

  // Rows rather than single tiles: a grid can't mix full-width section headers with tiles.
  const { items, months } = useMemo(() => {
    const result: ListItem[] = []
    const monthMarks: TimelineMonth[] = []
    for (const section of sections) {
      const { folderId } = section
      if (!folderId) {
        // One mixed list: ordered by date, with a heading for every month.
        const dated = sortByDate(section.photos, (entry) => entry.photo, sort)
        if (!showTimeline) {
          // Without the timeline the photos flow as one continuous grid.
          for (let i = 0; i < dated.length; i += columns) {
            const entries = dated.slice(i, i + columns).map(({ item }) => item)
            result.push({ kind: 'row', key: entries[0].key, entries })
          }
          continue
        }
        const keys = dated.map(({ time }) => monthOf(time))
        let start = 0
        while (start < dated.length) {
          const month = keys[start]
          let end = start
          while (end < dated.length && keys[end].key === month.key) end++
          monthMarks.push({
            key: month.key,
            year: month.year,
            label: month.label,
            itemIndex: result.length,
          })
          result.push({
            kind: 'month',
            key: `month:${month.key}`,
            label: month.label,
            isFirst: result.length === 0,
          })
          for (let i = start; i < end; i += columns) {
            const entries = dated
              .slice(i, Math.min(i + columns, end))
              .map(({ item }) => item)
            result.push({ kind: 'row', key: entries[0].key, entries })
          }
          start = end
        }
        continue
      }
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
    return { items: result, months: monthMarks }
  }, [sections, collapsed, columns, sort, showTimeline])
  const allPhotos = useMemo(() => {
    const byId = new Map<string, DrivePhoto>()
    for (const page of data.pages)
      for (const photo of page.files) byId.set(photo.id, photo)
    return [...byId.values()]
  }, [data.pages])
  const selectedPhotos = useMemo(
    () => allPhotos.filter((photo) => selectedIds.has(photo.id)),
    [allPhotos, selectedIds],
  )
  const stopSelecting = useCallback(() => {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }, [])
  const toggleSelected = useCallback((photoId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (!next.delete(photoId)) next.add(photoId)
      return next
    })
  }, [])
  useEffect(() => {
    if (!isSelecting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) stopSelecting()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSelecting, stopSelecting])
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

  const selectedPhoto = allPhotos.find((photo) => photo.id === selected)
  if (sections.length === 0)
    return (
      <p className={styles.status}>
        {filters?.some((filter) => !isEmptyFilter(filter))
          ? 'No photos match the selected tags.'
          : (emptyMessage ?? 'No photos in the connected folders.')}
      </p>
    )

  const isMixedByDate = sections[0].folderId === undefined
  const hasTimeline = showTimeline && months.length > 1
  const hasPanel = isSelecting && selectedPhotos.length > 0
  const allSelected = selectedPhotos.length === allPhotos.length
  return (
    <div className={hasPanel ? styles.withPanel : undefined}>
      <div
        className={`${styles.toolbar} ${hasTimeline ? styles.withTimeline : ''}`}
      >
        {!isMixedByDate ? null : (
          <label className={styles.sort}>
            <span>Sort by</span>
            <Dropdown
              options={SORT_OPTIONS}
              value={sort}
              onValueChange={setSort}
            />
          </label>
        )}
        {isSelecting ? (
          <>
            <span className={styles.toolbarCount} role="status">
              {selectedPhotos.length === 0
                ? 'Select photos'
                : `${formatNumber(selectedPhotos.length)} selected`}
            </span>
            <Button
              small
              variant="outline"
              onClick={() =>
                setSelectedIds(
                  allSelected ? new Set() : new Set(allPhotos.map((p) => p.id)),
                )
              }
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
            <Button small onClick={stopSelecting}>
              Done
            </Button>
          </>
        ) : (
          <Button small variant="outline" onClick={() => setIsSelecting(true)}>
            Select
          </Button>
        )}
      </div>
      <div
        ref={listElement}
        className={hasTimeline ? styles.withTimeline : undefined}
      >
        <Virtuoso
          ref={virtuoso}
          useWindowScroll
          data={items}
          increaseViewportBy={800}
          computeItemKey={(_, item) => item.key}
          itemContent={(_, item) => {
            if (item.kind === 'row')
              return (
                <PhotoRow
                  entries={item.entries}
                  columns={columns}
                  isSelecting={isSelecting}
                  selectedIds={selectedIds}
                  onSelect={isSelecting ? toggleSelected : setSelected}
                />
              )
            if (item.kind === 'month')
              return (
                <h3
                  className={`${styles.monthTitle} ${item.isFirst ? styles.firstMonthTitle : ''}`}
                >
                  {item.label}
                </h3>
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
      </div>
      {hasTimeline && (
        <Timeline
          className={hasPanel ? styles.timelineWithPanel : undefined}
          months={months}
          itemCount={items.length}
          listRef={listRef}
          onSeek={(index) =>
            virtuoso.current?.scrollToIndex({ index, align: 'start' })
          }
        />
      )}
      {hasPanel && (
        <BulkTagPanel
          token={token}
          photos={selectedPhotos}
          total={allPhotos.length}
        />
      )}
      {selectedPhoto && (
        <Lightbox
          token={token}
          photo={selectedPhoto}
          folders={folders}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
