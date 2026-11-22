import { useCallback, useSyncExternalStore } from 'react'
import type { SortOrder } from '../../../interfaces'
import { DEFAULT_SORT } from '../../../lib/constants'
import { isSortOrder } from '../../../lib/photoSort'
import { SORT_KEY } from '../constants'
import { read, subscribe, write } from '../utils/storage'

/** How the gallery orders photos, persisted locally. */
export function useGallerySort() {
  const stored = useSyncExternalStore(subscribe, () => read(SORT_KEY))
  const sort: SortOrder = isSortOrder(stored) ? stored : DEFAULT_SORT
  const setSort = useCallback((value: SortOrder) => write(SORT_KEY, value), [])
  return [sort, setSort] as const
}
