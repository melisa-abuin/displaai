import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchPhotoBlob,
  isHeic,
  normalizeTag,
  photoTags,
  thumbnailUrl,
  type DrivePhoto,
} from '../drive/api'
import { useHeicTransform, useUpdateTags } from '../drive/hooks'
import { formatBytes, formatDate } from '../format'
import { useFaces, useScene } from '../vision/hooks'
import styles from './Lightbox.module.css'
import { RegionBoxes } from './RegionBoxes'
import { Switch } from './Switch'
import { TagEditor } from './TagEditor'

/** Where an element sits inside its parent, including any transform, kept current on resize. */
function useRectInParent() {
  const [rect, setRect] = useState<DOMRect>()
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const box = element.getBoundingClientRect()
      const parent = element.parentElement?.getBoundingClientRect()
      setRect(
        new DOMRect(
          box.left - (parent?.left ?? 0),
          box.top - (parent?.top ?? 0),
          box.width,
          box.height,
        ),
      )
    }
    update()
    observer.current = new ResizeObserver(update)
    observer.current.observe(element)
    if (element.parentElement) observer.current.observe(element.parentElement)
  }, [])
  return [ref, rect] as const
}

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
  const [showFaces, setShowFaces] = useState(false)
  const [showObjects, setShowObjects] = useState(false)
  const [imageRef, imageRect] = useRectInParent()
  const updateTags = useUpdateTags(token)
  const faces = useFaces(token, photo.id, showFaces)
  const scene = useScene(token, photo.id, showObjects)

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
                ref={imageRef}
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
        {ready && imageRect && (showFaces || showObjects) && (
          <div
            className={styles.overlay}
            style={{
              left: imageRect.x,
              top: imageRect.y,
              width: imageRect.width,
              height: imageRect.height,
            }}
          >
            {showObjects && scene.data && (
              <RegionBoxes kind="object" regions={scene.data.objects} />
            )}
            {showFaces && faces.data && (
              <RegionBoxes kind="face" regions={faces.data.faces} />
            )}
          </div>
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
        <h3 className={styles.heading}>Smart analysis</h3>
        <div className={styles.option}>
          <span>Face boxes</span>
          <Switch
            aria-label="Face boxes"
            checked={showFaces}
            onChange={(e) => setShowFaces(e.target.checked)}
          />
        </div>
        {showFaces && (
          <p className={styles.note} role="status">
            {faces.error
              ? `Face detection failed: ${faces.error.message}`
              : faces.data
                ? `${faces.data.faces.length} ${faces.data.faces.length === 1 ? 'face' : 'faces'} found`
                : 'Detecting faces…'}
          </p>
        )}
        <div className={styles.option}>
          <span>Objects &amp; labels</span>
          <Switch
            aria-label="Objects and labels"
            checked={showObjects}
            onChange={(e) => setShowObjects(e.target.checked)}
          />
        </div>
        {showObjects && (
          <div className={styles.note} role="status">
            {scene.error ? (
              `Analysis failed: ${scene.error.message}`
            ) : !scene.data ? (
              'Analysing…'
            ) : (
              <>
                <p>
                  {scene.data.objects.length}{' '}
                  {scene.data.objects.length === 1 ? 'object' : 'objects'} found
                </p>
                {scene.data.labels.length > 0 && (
                  <ul className={styles.labels} aria-label="Suggested tags">
                    {scene.data.labels.map((label) => {
                      const tag = normalizeTag(label.name)
                      return (
                        <li key={label.name}>
                          <button
                            type="button"
                            title={`${Math.round(label.score * 100)}% - add as tag`}
                            disabled={
                              !tag ||
                              photoTags(photo).includes(tag) ||
                              updateTags.isPending
                            }
                            onClick={() =>
                              tag &&
                              updateTags.mutate({
                                photoId: photo.id,
                                add: [tag],
                                remove: [],
                              })
                            }
                          >
                            + {label.name}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
        <h3 className={styles.heading}>Tags</h3>{' '}
        <TagEditor token={token} photo={photo} />
      </aside>
    </div>
  )
}
