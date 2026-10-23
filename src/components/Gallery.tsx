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

type Row =
  | { kind: 'header'; key: string; folderId: string }
  | { kind: 'photos'; key: string; entries: PhotoEntry[] }

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
}: {
  token: string
  folderIds: readonly string[]
  /** Show one section per folder, with its name, instead of one mixed list. */
  grouped: boolean
  folders?: ReadonlyMap<string, DriveFolder>
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
  const [containerRef, columns] = useColumns()

  const showHeaders = grouped && folderIds.length > 1
  // Rows rather than single tiles: a grid can't mix full-width folder headers with tiles.
  const rows = useMemo(() => {
    const result: Row[] = []
    let buffer: PhotoEntry[] = []
    const flush = () => {
      if (buffer.length > 0)
        result.push({ kind: 'photos', key: buffer[0].key, entries: buffer })
      buffer = []
    }
    let currentFolder: string | undefined
    for (const page of data?.pages ?? []) {
      if (page.files.length === 0) continue
      const folderId = page.folderId
      if (showHeaders && folderId && folderId !== currentFolder) {
        flush()
        result.push({ kind: 'header', key: `header:${folderId}`, folderId })
      }
      currentFolder = folderId
      for (const photo of page.files) {
        buffer.push({ key: `${folderId ?? ''}:${photo.id}`, photo })
        if (buffer.length === columns) flush()
      }
    }
    flush()
    return result
  }, [data, showHeaders, columns])

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
  if (rows.length === 0)
    return <p className={styles.status}>No photos in the connected folders.</p>

  return (
    <div ref={containerRef}>
      <Virtuoso
        useWindowScroll
        data={rows}
        increaseViewportBy={800}
        computeItemKey={(_, row) => row.key}
        endReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        itemContent={(_, row) => {
          if (row.kind === 'header') {
            const folder = folders?.get(row.folderId)
            return (
              <div className={styles.headerRow}>
                <h3 className={styles.folderHeader} title={folder?.path}>
                  <span className={styles.folderName}>
                    {folder?.name ?? 'Unknown folder'}
                  </span>
                  {folder && (
                    <span className={styles.folderCount}>
                      {formatNumber(folder.photoCount)}
                    </span>
                  )}
                </h3>
              </div>
            )
          }
          return (
            <div
              className={styles.row}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {row.entries.map(({ key, photo }) => (
                <button
                  key={key}
                  type="button"
                  className={styles.tile}
                  onClick={() => setSelected(photo.id)}
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
