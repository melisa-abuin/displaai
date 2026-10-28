import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchPhotoBlob,
  isHeic,
  normalizeTag,
  photoTags,
  thumbnailUrl,
  type DriveFolder,
  type DrivePhoto,
} from '../drive/api'
import { useHeicTransform, useUpdateTags } from '../drive/hooks'
import { useFreshThumbnails } from '../drive/libraryStore'
import { PhotoEditor } from '../editor/PhotoEditor'
import { formatBytes, formatDate, formatNumber } from '../format'
import { mediaKindOf } from '../mediaKind'
import { useLocalAi } from '../settings'
import { useFaces, useScene } from '../vision/hooks'
import { Button } from './Button'
import styles from './Lightbox.module.css'
import { RegionBoxes } from './RegionBoxes'
import { Switch } from './Switch'
import { TagEditor } from './TagEditor'

const ICON = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

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

type MobilePanel = 'info' | 'tags'

export function Lightbox({
  token,
  photo: indexedPhoto,
  folders,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  folders?: ReadonlyMap<string, DriveFolder>
  onClose: () => void
}) {
  const [photo] = useFreshThumbnails([indexedPhoto])
  const isVideo = mediaKindOf(photo) === 'videos'
  // size 0 asks Drive for the full-resolution rendering
  const renderedUrl = isHeic(photo) ? thumbnailUrl(photo, 0) : undefined
  // Drive's thumbnails up to 512px are upright; the default size is already in the browser cache from the gallery.
  const thumbUrl = renderedUrl && thumbnailUrl(photo)
  // Shown enlarged and blurred until the full image is ready.
  const placeholderUrl = thumbnailUrl(photo)
  const [decodedSrc, setDecodedSrc] = useState<string>()
  // null means the image failed to load
  const [thumbPortrait, setThumbPortrait] = useState<boolean | null>()
  const [renderedPortrait, setRenderedPortrait] = useState<boolean | null>()
  const [loadedSize, setLoadedSize] = useState<{ w: number; h: number }>()
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
  const [videoFailed, setVideoFailed] = useState(false)
  const fullSrc = renderedUrl ?? objectUrl
  const [storedLocalAi] = useLocalAi()
  const localAi = storedLocalAi && !isVideo
  const [faceBoxes, setShowFaces] = useState(false)
  const [objectBoxes, setShowObjects] = useState(false)
  const showFaces = localAi && faceBoxes
  const showObjects = localAi && objectBoxes
  const [editing, setEditing] = useState(false)
  // The bottom drawer open on small screens; on wide ones the side panel shows everything.
  const [panel, setPanel] = useState<MobilePanel | null>(null)
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
      if (e.key === 'Escape' && !e.defaultPrevented && !editing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  const folderId = photo.parents?.[0]
  const folderPath = folderId ? folders?.get(folderId)?.path : undefined
  const meta = photo.imageMediaMetadata
  // Drive omits dimensions for some files (e.g. HEIC or not-yet-processed), so fall back to the decoded image.
  const dimensions =
    meta?.width && meta.height
      ? { w: meta.width, h: meta.height }
      : loadedSize && transform
        ? { w: loadedSize.h, h: loadedSize.w }
        : loadedSize
  const details = [
    ['Taken', formatDate(meta?.time)],
    ['Added', formatDate(photo.createdTime)],
    [
      'Size',
      dimensions
        ? `${formatNumber(dimensions.w)} × ${formatNumber(dimensions.h)}`
        : undefined,
    ],
    ['File size', formatBytes(photo.size)],
  ].filter((row): row is [string, string] => Boolean(row[1]))
  const togglePanel = (next: MobilePanel) =>
    setPanel((current) => (current === next ? null : next))

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
    >
      <div
        className={styles.stage}
        onClick={panel ? () => setPanel(null) : onClose}
      >
        {error || videoFailed ? (
          <p role="alert">Could not load {isVideo ? 'video' : 'image'}.</p>
        ) : (
          <>
            {isVideo && objectUrl && (
              <video
                src={objectUrl}
                controls
                autoPlay
                playsInline
                className={styles.image}
                onLoadedData={() => setDecodedSrc(objectUrl)}
                onError={() => setVideoFailed(true)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {!isVideo && (renderedUrl ?? objectUrl) && (
              <img
                ref={imageRef}
                src={renderedUrl ?? objectUrl}
                alt={photo.name}
                referrerPolicy="no-referrer"
                hidden={!ready}
                className={`${styles.image} ${transform ? styles.sideways : ''}`}
                style={transform ? { transform } : undefined}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setRenderedPortrait(img.naturalHeight > img.naturalWidth)
                  setLoadedSize({ w: img.naturalWidth, h: img.naturalHeight })
                  // The placeholder stays until the full image is decoded, so there's no blank frame in between.
                  img
                    .decode()
                    .catch(() => undefined)
                    .then(() => setDecodedSrc(img.currentSrc))
                }}
                onError={() => setRenderedPortrait(null)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {!(fullSrc && ready && decodedSrc === fullSrc) && (
              <>
                {placeholderUrl && (
                  <img
                    src={placeholderUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className={styles.placeholder}
                  />
                )}
                <div
                  className={styles.loading}
                  role="status"
                  aria-label="Loading"
                >
                  <span className={styles.spinner} />
                </div>
              </>
            )}
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
      <button
        type="button"
        className={`${styles.close} ${styles.mobileClose}`}
        aria-label="Close"
        onClick={onClose}
      >
        &times;
      </button>
      <aside
        className={styles.info}
        aria-label="Photo info"
        data-panel={panel ?? undefined}
      >
        <button
          type="button"
          className={`${styles.close} ${styles.desktopClose}`}
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.infoGroup}>
          <h2 className={styles.name}>{photo.name}</h2>
          {folderId && (
            <div className={styles.location}>
              <span className={styles.path} title={folderPath}>
                {folderPath ?? 'Unknown folder'}
              </span>
              <a
                className={styles.open}
                href={`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open folder in Google Drive"
                title="Open folder in Google Drive"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 3h7v7M10 14 21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                </svg>
                Open
              </a>
            </div>
          )}
        </div>
        {!isVideo && (
          <Button className={styles.edit} onClick={() => setEditing(true)}>
            Edit photo
          </Button>
        )}
        <div className={styles.infoGroup}>
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
          {localAi && (
            <>
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
                        {scene.data.objects.length === 1 ? 'object' : 'objects'}{' '}
                        found
                      </p>
                      {scene.data.labels.length > 0 && (
                        <ul
                          className={styles.labels}
                          aria-label="Suggested tags"
                        >
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
            </>
          )}
        </div>
        <div className={styles.tags}>
          <h3 className={styles.heading}>Tags</h3>{' '}
          <TagEditor token={token} photos={[photo]} />
        </div>
      </aside>
      <nav className={styles.mobileBar} aria-label="Photo actions">
        {!isVideo && (
          <button
            type="button"
            className={styles.mobileAction}
            aria-label="Edit photo"
            onClick={() => {
              setPanel(null)
              setEditing(true)
            }}
          >
            <svg {...ICON} aria-hidden="true">
              <path d="M21.17 6.81a2.83 2.83 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className={styles.mobileAction}
          aria-label="Info"
          aria-expanded={panel === 'info'}
          onClick={() => togglePanel('info')}
        >
          <svg {...ICON} aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.mobileAction}
          aria-label="Tags"
          aria-expanded={panel === 'tags'}
          onClick={() => togglePanel('tags')}
        >
          <svg {...ICON} aria-hidden="true">
            <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42Z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
          </svg>
        </button>
      </nav>
      {editing && (
        <PhotoEditor
          token={token}
          photo={photo}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
