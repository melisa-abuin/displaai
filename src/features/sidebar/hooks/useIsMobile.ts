import { useSyncExternalStore } from 'react'
import { MOBILE_QUERY } from '../constants'

function subscribeMobile(listener: () => void) {
  const query = window.matchMedia?.(MOBILE_QUERY)
  query?.addEventListener('change', listener)
  return () => query?.removeEventListener('change', listener)
}

const getIsMobile = () => window.matchMedia?.(MOBILE_QUERY).matches ?? false

/** Whether the screen is narrow enough for the bottom bar instead of the sidebar. */
export function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getIsMobile)
}
