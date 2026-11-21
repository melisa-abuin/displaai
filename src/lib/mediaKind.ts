import type { MediaKind } from '../interfaces'
import { MEDIA_KINDS } from './constants'

export function isMediaKind(value: unknown): value is MediaKind {
  return MEDIA_KINDS.some((kind) => kind.value === value)
}

/** Anything that isn't a GIF or a video counts as an image. */
export function mediaKindOf(file: { mimeType: string }): MediaKind {
  const type = file.mimeType.toLowerCase()
  if (type === 'image/gif') return 'gifs'
  if (type.startsWith('video/')) return 'videos'
  return 'images'
}
