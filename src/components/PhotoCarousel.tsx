import { useEffect, useState } from 'react'
import {
  thumbnailUrl,
  type DriveFolder,
  type PhotoLocation,
} from '../drive/api'
import { useFreshThumbnails } from '../drive/libraryStore'
import { formatNumber } from '../format'
import { PhotoCard } from './PhotoCard'
import styles from './PhotoMap.module.css'

/** One photo at a time, with arrows to step through the rest. */
export function PhotoCarousel({
  photos,
  folders,
}: {
  photos: PhotoLocation[]
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  const [index, setIndex] = useState(0)
  const count = photos.length
  const step = (by: number) => setIndex((i) => (i + by + count) % count)

  const [next] = useFreshThumbnails([photos[(index + 1) % count]])
  const nextUrl = thumbnailUrl(next, 480)
  // Warm the cache so stepping to the next photo doesn't flash an empty card.
  useEffect(() => {
    if (nextUrl) new Image().src = nextUrl
  }, [nextUrl])

  return (
    <div className={styles.carousel}>
      <PhotoCard
        key={photos[index].id}
        photo={photos[index]}
        folders={folders}
      />
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowPrev}`}
        aria-label="Previous photo"
        onClick={() => step(-1)}
      >
        &lsaquo;
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowNext}`}
        aria-label="Next photo"
        onClick={() => step(1)}
      >
        &rsaquo;
      </button>
      <span className={styles.counter} aria-live="polite">
        {formatNumber(index + 1)} / {formatNumber(count)}
      </span>
    </div>
  )
}
