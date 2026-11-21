import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { fetchPhotoBlob } from '../drive/api'
import type { DrivePhoto } from '../interfaces'
import { decodeForEditing } from './edit'
import { Editor } from './Editor'
import styles from './PhotoEditor.module.css'

export function PhotoEditor({
  token,
  photo,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  onClose: () => void
}) {
  const { data: blob, error: loadError } = useQuery({
    queryKey: ['drive', 'photo-blob', photo.id],
    queryFn: () => fetchPhotoBlob(token, photo.id),
    staleTime: 1000 * 30,
    gcTime: 0,
    meta: { persist: false },
  })
  const [source, setSource] = useState<HTMLCanvasElement>()
  const [decodeError, setDecodeError] = useState<string>()

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    decodeForEditing(blob).then(
      (canvas) => !cancelled && setSource(canvas),
      (e: unknown) =>
        !cancelled &&
        setDecodeError(e instanceof Error ? e.message : 'Could not open image'),
    )
    return () => {
      cancelled = true
    }
  }, [blob])

  const failure = loadError?.message ?? decodeError

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${photo.name}`}
    >
      {source ? (
        <Editor token={token} photo={photo} source={source} onClose={onClose} />
      ) : (
        <div className={styles.loading} role="status">
          {failure ? (
            <>
              <p role="alert">Could not open the photo: {failure}</p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </>
          ) : (
            <>
              <span className={styles.spinner} />
              <p>Opening photo…</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
