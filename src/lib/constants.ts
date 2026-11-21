import type { MediaKind, SortOrder } from '../interfaces'

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

export const DEFAULT_SORT: SortOrder = 'taken-desc'

export const SORT_OPTIONS: readonly { value: SortOrder; label: string }[] = [
  { value: 'taken-desc', label: 'Date taken: newest first' },
  { value: 'taken-asc', label: 'Date taken: oldest first' },
  { value: 'added-desc', label: 'Date added: newest first' },
  { value: 'added-asc', label: 'Date added: oldest first' },
]

export const NAVIGATE_EVENT = 'app:navigate'

export const FOLDERS_PATH = '/settings/folders'

export const VIEWS_PATH = '/settings/views'

export const TAG_PARAM = 'tag'

export const EXCLUDE_PARAM = 'not'

export const MATCH_PARAM = 'match'
