import { useState } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import { thumbnailUrl } from '../drive/api'
import { usePhotos } from '../drive/hooks'
import { Lightbox } from './Lightbox'
import styles from './Gallery.module.css'

export function Gallery({
  token,
  folderIds,
}: {
  token: string
  folderIds: readonly string[]
}) {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotos(token, folderIds)
  const [selected, setSelected] = useState<string | null>(null)

  if (isLoading) return <p className={styles.status}>Loading photos&hellip;</p>
  if (error)
    return (
      <p role="alert" className={styles.status}>
        Could not load photos.
      </p>
    )

  const photos = data?.pages.flatMap((page) => page.files) ?? []
  const selectedPhoto = photos.find((photo) => photo.id === selected)
  if (photos.length === 0)
    return <p className={styles.status}>No photos in the connected folders.</p>

  return (
    <>
      <VirtuosoGrid
        useWindowScroll
        data={photos}
        overscan={800}
        computeItemKey={(_, photo) => photo.id}
        listClassName={styles.grid}
        endReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        itemContent={(_, photo) => (
          <button
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
        )}
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
    </>
  )
}
