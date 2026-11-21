import { latLngBounds } from 'leaflet'

// Web Mercator tiles end at about 85.05Â° latitude.
export const WORLD = latLngBounds([-85.0511, -180], [85.0511, 180])

export const DARK_QUERY = '(prefers-color-scheme: dark)'

export const MAX_ZOOM = 18
