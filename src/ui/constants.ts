export const LAZY_IMAGE_OBSERVER_OPTIONS = {
  root: null,
  // Start loading shortly before the image scrolls into view.
  rootMargin: '200px',
  threshold: 0,
}

export const LAZY_IMAGE_MAX_RETRIES = 3

export const LAZY_IMAGE_RETRY_MS = 1500

export const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const
