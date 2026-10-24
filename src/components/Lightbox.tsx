import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  fetchPhotoBlob,
  isHeic,
  thumbnailUrl,
  type DrivePhoto,
} from '../drive/api'
import { useHeicTransform } from '../drive/hooks'
import { formatBytes, formatDate } from '../format'
import styles from './Lightbox.module.css'
import { TagEditor } from './TagEditor'

export function Lightbox({
  token,
  photo,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  onClose: () => void
}) {
  // size 0 asks Drive for the full-resolution rendering
  const renderedUrl = isHeic(photo) ? thumbnailUrl(photo, 0) : undefined
  // Drive's thumbnails up to 512px are upright; the default size is already in the browser cache from the gallery.
  const thumbUrl = renderedUrl && thumbnailUrl(photo)
  // null means the image failed to load
  const [thumbPortrait, setThumbPortrait] = useState<boolean | null>()
  const [renderedPortrait, setRenderedPortrait] = useState<boolean | null>()
  const mismatch =
    typeof thumbPortrait === 'boolean' &&
    typeof renderedPortrait === 'boolean' &&
    thumbPortrait !== renderedPortrait
  const { data: heic, isPending: heicPending } = useHeicTransform(
    token,
    photo.id,
    mismatch,
  )
  const transform = mismatch && heic?.sideways ? heic.css : undefined
  // The raw render is sideways for some HEICs, so it stays hidden until its fix is known.
  const ready =
    !renderedUrl ||
    (thumbPortrait !== undefined &&
      renderedPortrait !== undefined &&
      (!mismatch || !heicPending))
  const { data: blob, error } = useQuery({
    queryKey: ['drive', 'photo-blob', photo.id],
    queryFn: () => fetchPhotoBlob(token, photo.id),
    enabled: !renderedUrl,
    gcTime: 0,
    meta: { persist: false },
  })
  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    if (!thumbUrl) return
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.onload = () => setThumbPortrait(img.naturalHeight > img.naturalWidth)
    img.onerror = () => setThumbPortrait(null)
    img.src = thumbUrl
  }, [thumbUrl])

  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = photo.imageMediaMetadata
  const details = [
    ['Taken', formatDate(meta?.time)],
    ['Added', formatDate(photo.createdTime)],
    ['Size', meta?.width && meta.height ? ` × ` : undefined],
    ['File size', formatBytes(photo.size)],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
    >
      <div className={styles.stage} onClick={onClose}>
        {error ? (
          <p role="alert">Could not load image.</p>
        ) : (
          <>
            {(renderedUrl ?? objectUrl) && (
              <img
                src={renderedUrl ?? objectUrl}
                alt={photo.name}
                referrerPolicy="no-referrer"
                hidden={!ready}
                className={`${styles.image} ${transform ? styles.sideways : ''}`}
                style={transform ? { transform } : undefined}
                onLoad={(e) =>
                  setRenderedPortrait(
                    e.currentTarget.naturalHeight >
                      e.currentTarget.naturalWidth,
                  )
                }
                onError={() => setRenderedPortrait(null)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {!((renderedUrl ?? objectUrl) && ready) && <p>Loading&hellip;</p>}
          </>
        )}
      </div>
      <aside className={styles.info} aria-label="Photo info">
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className={styles.name}>{photo.name}</h2>
        {details.length > 0 && (
          <dl className={styles.details}>
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <h3 className={styles.heading}>Tags</h3>
        <TagEditor token={token} photo={photo} />
      </aside>
    </div>
  )
}
