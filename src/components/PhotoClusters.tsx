import { divIcon } from 'leaflet'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import Supercluster from 'supercluster'
import type { DriveFolder, PhotoLocation } from '../drive/api'
import { PhotoCarousel } from './PhotoCarousel'
import { PhotoCard } from './PhotoCard'
import styles from './PhotoMap.module.css'

interface PointProps {
  photo: PhotoLocation
}

type Clusters = ReturnType<Supercluster<PointProps>['getClusters']>

const MAX_ZOOM = 18

function sizeFor(count: number) {
  if (count < 10) return 34
  if (count < 100) return 40
  if (count < 1000) return 48
  return 56
}

/** Mounted only while its popup is open, so the members are looked up on demand. */
function ClusterPopup({
  index,
  clusterId,
  folders,
}: {
  index: Supercluster<PointProps>
  clusterId: number
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  const photos = useMemo(
    () =>
      index.getLeaves(clusterId, Infinity).map((leaf) => leaf.properties.photo),
    [index, clusterId],
  )
  return <PhotoCarousel photos={photos} folders={folders} />
}

function ClusterMarker({
  index,
  clusterId,
  count,
  label,
  position,
  folders,
}: {
  index: Supercluster<PointProps>
  clusterId: number
  count: number
  label: string
  position: [number, number]
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  const icon = useMemo(() => {
    const size = sizeFor(count)
    return divIcon({
      html: `<span>${label}</span>`,
      className: styles.cluster,
      iconSize: [size, size],
      popupAnchor: [0, -size / 2],
    })
  }, [count, label])
  return (
    <Marker position={position} icon={icon}>
      <Popup
        className="photo-popup"
        minWidth={240}
        maxWidth={240}
        autoPanPadding={[24, 24]}
      >
        <ClusterPopup index={index} clusterId={clusterId} folders={folders} />
      </Popup>
    </Marker>
  )
}

/** Photos on the map: single dots, merged into numbered clusters while zoomed out. */
export function PhotoClusters({
  photos,
  folders,
}: {
  photos: PhotoLocation[]
  folders: ReadonlyMap<string, DriveFolder> | undefined
}) {
  const map = useMap()

  const index = useMemo(() => {
    const tree = new Supercluster<PointProps>({ radius: 60, maxZoom: MAX_ZOOM })
    tree.load(
      photos.map((photo) => ({
        type: 'Feature' as const,
        properties: { photo },
        geometry: {
          type: 'Point' as const,
          coordinates: [photo.longitude, photo.latitude],
        },
      })),
    )
    return tree
  }, [photos])

  const [clusters, setClusters] = useState<Clusters>([])
  const update = useCallback(() => {
    const bounds = map.getBounds().pad(0.2)
    setClusters(
      index.getClusters(
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
        Math.round(map.getZoom()),
      ),
    )
  }, [map, index])

  useMapEvents({ moveend: update })
  useEffect(update, [update])

  return clusters.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    if ('cluster' in feature.properties && feature.properties.cluster) {
      const { cluster_id, point_count, point_count_abbreviated } =
        feature.properties
      return (
        <ClusterMarker
          key={`cluster:${cluster_id}`}
          index={index}
          clusterId={cluster_id}
          count={point_count}
          label={String(point_count_abbreviated)}
          position={[lat, lng]}
          folders={folders}
        />
      )
    }
    const { photo } = feature.properties as PointProps
    return (
      <CircleMarker
        key={photo.id}
        center={[lat, lng]}
        radius={5}
        pathOptions={{
          color: '#ffffff',
          weight: 1,
          fillColor: '#aa85f8',
          fillOpacity: 0.9,
        }}
        eventHandlers={{
          // Anchor to the dot's center, not the exact click point.
          popupopen: (e) => e.popup.setLatLng([lat, lng]),
        }}
      >
        <Popup
          className="photo-popup"
          minWidth={240}
          maxWidth={240}
          offset={[0, -8]}
        >
          <PhotoCard photo={photo} folders={folders} />
        </Popup>
      </CircleMarker>
    )
  })
}
