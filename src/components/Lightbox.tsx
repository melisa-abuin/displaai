import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  fetchPhotoBlob,
  isHeic,
  thumbnailUrl,
  type DrivePhoto,
} from '../drive/api'
import styles from './Lightbox.module.css'

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
  const { data: blob, error } = useQuery({
    queryKey: ['drive', 'photo-blob', photo.id],
    queryFn: () => fetchPhotoBlob(token, photo.id),
    enabled: !renderedUrl,
    gcTime: 0,
    meta: { persist: false },
  })
  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        onClick={onClose}
      >
        &times;
      </button>
      {error ? (
        <p role="alert">Could not load image.</p>
      ) : (renderedUrl ?? objectUrl) ? (
        <img
          src={renderedUrl ?? objectUrl}
          alt={photo.name}
          referrerPolicy="no-referrer"
          className={styles.image}
        />
      ) : (
        <p>Loading&hellip;</p>
      )}
    </div>
  )
}
