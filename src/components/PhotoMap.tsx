import { latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    useMap,
} from 'react-leaflet'
import { thumbnailUrl, type DriveFolder, type PhotoLocation } from '../drive/api'
import { usePhotoLocations } from '../drive/hooks'
import { formatDate } from '../format'
import './PhotoMap.css'
import styles from './PhotoMap.module.css'

// Web Mercator tiles end at about 85.05° latitude.
const WORLD = latLngBounds([-85.0511, -180], [85.0511, 180])

// Stops zooming out once the world fills the whole container, so nothing but map shows.
function LockToWorld() {
  const map = useMap()
  useEffect(() => {
    const update = () => {
      const { x, y } = map.getSize()
      // The Mercator world is square: 256 * 2^zoom px per side.
      map.setMinZoom(Math.log2(Math.max(x, y) / 256))
    }
    update()
    map.on('resize', update)
    return () => {
      map.off('resize', update)
    }
  }, [map])
  return null
}

function FitBounds({ photos }: { photos: PhotoLocation[] }) {
  const map = useMap()
  useEffect(() => {
    if (photos.length === 0) return
    map.fitBounds(
      latLngBounds(photos.map((photo) => [photo.latitude, photo.longitude])),
      { padding: [24, 24], maxZoom: 14 },
    )
  }, [map, photos])
  return null
}

export function PhotoMap({
  token,
  folderIds,
  folders,
}: {
  token: string
  folderIds: readonly string[]
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  const { data, isLoading, error } = usePhotoLocations(token, folderIds)

  if (isLoading) return <p className={styles.status}>Loading locations&hellip;</p>
  if (error)
    return (
      <p role="alert" className={styles.status}>
        Could not load locations.
      </p>
    )

  const photos = data ?? []
  if (photos.length === 0)
    return <p className={styles.status}>No photos with a location.</p>

  return (
    <MapContainer
      className={styles.map}
      center={[0, 0]}
      zoom={2}
      preferCanvas
      maxBounds={WORLD}
      maxBoundsViscosity={1}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        noWrap
      />
      <LockToWorld />
      <FitBounds photos={photos} />
      {photos.map((photo) => (
        <CircleMarker
          key={photo.id}
          center={[photo.latitude, photo.longitude]}
          radius={5}
          pathOptions={{
            color: '#ffffff',
            weight: 1,
            fillColor: '#aa85f8',
            fillOpacity: 0.9,
          }}
          eventHandlers={{
            // Anchor to the dot's center, not the exact click point.
            popupopen: (e) =>
              e.popup.setLatLng([photo.latitude, photo.longitude]),
          }}
        >
          <Popup
            className="photo-popup"
            minWidth={240}
            maxWidth={240}
            offset={[0, -8]}
          >
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
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
