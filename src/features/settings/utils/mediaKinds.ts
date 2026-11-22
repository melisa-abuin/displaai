import type { MediaKind } from '../../../interfaces'
import { DEFAULT_MEDIA_KINDS } from '../../../lib/constants'
import { isMediaKind } from '../../../lib/mediaKind'
import { MEDIA_KINDS_KEY } from '../constants'
import { read } from './storage'

let parsedKinds:
  { raw: string | null; kinds: ReadonlySet<MediaKind> } | undefined

/** The media types to show, from their stored form; images only when nothing valid is stored. */
export function parseMediaKinds(raw: string | null): ReadonlySet<MediaKind> {
  if (parsedKinds?.raw === raw) return parsedKinds.kinds
  let list: unknown
  try {
    list = raw ? JSON.parse(raw) : undefined
  } catch {
    list = undefined
  }
  const valid = Array.isArray(list) ? list.filter(isMediaKind) : []
  const kinds = new Set<MediaKind>(valid.length ? valid : DEFAULT_MEDIA_KINDS)
  parsedKinds = { raw, kinds }
  return kinds
}

/** The media types currently shown, for code outside React. */
export function getMediaKinds(): ReadonlySet<MediaKind> {
  return parseMediaKinds(read(MEDIA_KINDS_KEY))
}
