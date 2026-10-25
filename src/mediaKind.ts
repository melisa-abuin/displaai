export type MediaKind = 'images' | 'gifs' | 'videos'

export const MEDIA_KINDS: readonly {
  value: MediaKind
  label: string
  hint: string
}[] = [
  {
    value: 'images',
    label: 'Images',
    hint: 'Photos and pictures of any format (JPEG, PNG, HEIC, WebP, RAW...), except GIFs.',
  },
  { value: 'gifs', label: 'GIFs', hint: 'Animated and still GIF files.' },
  {
    value: 'videos',
    label: 'Videos',
    hint: 'Video files (MP4, MOV, WebM...). Opening one downloads it first.',
  },
]

export const DEFAULT_MEDIA_KINDS: readonly MediaKind[] = ['images']

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
