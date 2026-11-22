import { useCallback, useSyncExternalStore } from 'react'
import type { MediaKind } from '../../../interfaces'
import { MEDIA_KINDS } from '../../../lib/constants'
import { MEDIA_KINDS_KEY } from '../constants'
import { parseMediaKinds } from '../utils/mediaKinds'
import { read, subscribe, write } from '../utils/storage'

/** Which media types (images, GIFs, videos) the app shows, persisted locally. Images only by default. */
export function useMediaKinds() {
  const kinds = parseMediaKinds(
    useSyncExternalStore(subscribe, () => read(MEDIA_KINDS_KEY)),
  )
  const setKinds = useCallback((value: ReadonlySet<MediaKind>) => {
    const ordered = MEDIA_KINDS.map((kind) => kind.value).filter((kind) =>
      value.has(kind),
    )
    write(MEDIA_KINDS_KEY, JSON.stringify(ordered))
  }, [])
  return [kinds, setKinds] as const
}
