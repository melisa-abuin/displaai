import { thumbnailUrl, type DriveFolder, type PhotoLocation } from '../drive/api'
import { formatDate } from '../format'
import styles from './PhotoMap.module.css'

export function PhotoCard({
  photo,
  folders,
}: {
  photo: PhotoLocation
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  return (
    <div className={styles.card}>
      {thumbnailUrl(photo) && (
        <img
          src={thumbnailUrl(photo, 480)}
          alt={photo.name}
          referrerPolicy="no-referrer"
        />
      )}
      <div className={styles.caption}>
        <p className={styles.album}>
          {(photo.parentId && folders?.get(photo.parentId)?.name) ??
            'Unknown album'}
        </p>
        {formatDate(photo.date) && (
          <p className={styles.date}>{formatDate(photo.date)}</p>
        )}
      </div>
    </div>
  )
}
