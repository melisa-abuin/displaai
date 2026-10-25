import type { DrivePhoto } from './drive/api'
import { parseDate } from './format'

export type SortOrder = 'taken-desc' | 'taken-asc' | 'added-desc' | 'added-asc'

export const DEFAULT_SORT: SortOrder = 'taken-desc'

export const SORT_OPTIONS: readonly { value: SortOrder; label: string }[] = [
  { value: 'taken-desc', label: 'Date taken: newest first' },
  { value: 'taken-asc', label: 'Date taken: oldest first' },
  { value: 'added-desc', label: 'Date added: newest first' },
  { value: 'added-asc', label: 'Date added: oldest first' },
]

export function isSortOrder(value: unknown): value is SortOrder {
  return SORT_OPTIONS.some((option) => option.value === value)
}

/** The moment a photo is placed at for the order: capture time falls back to the added time. */
function photoTime(photo: DrivePhoto, order: SortOrder): number | undefined {
  const raw = order.startsWith('taken')
    ? (photo.imageMediaMetadata?.time ?? photo.createdTime)
    : photo.createdTime
  return parseDate(raw)?.getTime()
}

export interface Dated<T> {
  item: T
  /** Epoch ms; unset when the photo has no usable date. */
  time?: number
}

/** Sorts by date, keeping undated photos last whichever the direction. */
export function sortByDate<T>(
  items: readonly T[],
  getPhoto: (item: T) => DrivePhoto,
  order: SortOrder,
): Dated<T>[] {
  const direction = order.endsWith('asc') ? 1 : -1
  return items
    .map((item) => ({ item, time: photoTime(getPhoto(item), order) }))
    .sort((a, b) => {
      if (a.time === undefined || b.time === undefined)
        return (a.time === undefined ? 1 : 0) - (b.time === undefined ? 1 : 0)
      return (a.time - b.time) * direction
    })
}

export interface MonthKey {
  /** Unique and ordered per calendar month; -1 for undated. */
  key: number
  year?: number
  label: string
  shortLabel: string
}

export function monthOf(time: number | undefined): MonthKey {
  if (time === undefined)
    return { key: -1, label: 'No date', shortLabel: 'No date' }
  const date = new Date(time)
  return {
    key: date.getFullYear() * 12 + date.getMonth(),
    year: date.getFullYear(),
    label: date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
    shortLabel: date.toLocaleDateString(undefined, { month: 'short' }),
  }
}
