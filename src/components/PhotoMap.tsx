import { DomEvent, latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { type DriveFolder, type PhotoLocation } from '../drive/api'
import { usePhotoLocations } from '../drive/hooks'
import type { TagFilter } from '../drive/tagFilter'
import { PhotoClusters } from './PhotoClusters'
import './PhotoMap.css'
import styles from './PhotoMap.module.css'

// Web Mercator tiles end at about 85.05Â° latitude.
const WORLD = latLngBounds([-85.0511, -180], [85.0511, 180])

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeDark(listener: () => void) {
  const query = window.matchMedia?.(DARK_QUERY)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

const getIsDark = () => window.matchMedia?.(DARK_QUERY).matches ?? true

/** The map style follows the system theme, like the rest of the app. */
function useIsDark() {
  return useSyncExternalStore(subscribeDark, getIsDark)
}

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

/** A button beside the zoom controls that switches between clustered and individual photos. */
function GroupToggle({
  grouped,
  onChange,
}: {
  grouped: boolean
  onChange: (grouped: boolean) => void
}) {
  const element = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!element.current) return
    // Keeps clicks and double-clicks on the button from reaching the map.
    DomEvent.disableClickPropagation(element.current)
  }, [])
  const label = grouped ? 'Show every photo' : 'Group photos into clusters'
  return (
    <button
      ref={element}
      type="button"
      className={styles.groupToggle}
      aria-pressed={grouped}
      aria-label={label}
      title={label}
      onClick={() => onChange(!grouped)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="5" />
        <circle cx="16" cy="16" r="4" />
        <circle cx="18" cy="6" r="2" />
      </svg>
    </button>
  )
}

export function PhotoMap({
  folderIds,
  folders,
  filters,
}: {
  folderIds: readonly string[]
  folders: ReadonlyMap<string, DriveFolder> | undefined
  filters: readonly TagFilter[]
}) {
  const { data, isLoading, error } = usePhotoLocations(folderIds, filters)
  const [grouped, setGrouped] = useState(true)
  const isDark = useIsDark()

  if (isLoading)
    return <p className={styles.status}>Loading locations&hellip;</p>
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
        url={`https://tiles.stadiamaps.com/tiles/${isDark ? 'alidade_smooth_dark' : 'alidade_smooth'}/{z}/{x}/{y}{r}.png`}
        noWrap
      />
      <LockToWorld />
      <FitBounds photos={photos} />
      <PhotoClusters photos={photos} folders={folders} grouped={grouped} />
      <GroupToggle grouped={grouped} onChange={setGrouped} />
    </MapContainer>
  )
}
