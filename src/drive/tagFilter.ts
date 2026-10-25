import { photoTags, type DrivePhoto } from './api'

/** `any` keeps photos with at least one selected tag, `all` those with every one. */
export type TagMatch = 'any' | 'all'

export interface TagFilter {
  /** Tags to include, combined according to `match`. */
  tags: readonly string[]
  /** Photos with any of these tags are always left out. */
  exclude: readonly string[]
  match: TagMatch
}

const NONE: readonly string[] = []

export const NO_FILTER: TagFilter = { tags: NONE, exclude: NONE, match: 'any' }

/** Filters that must all match; a view's own filter plus the sidebar's. */
export const NO_FILTERS: readonly TagFilter[] = []

export function isEmptyFilter(filter: TagFilter): boolean {
  return filter.tags.length === 0 && filter.exclude.length === 0
}

export function matchesTags(
  photo: Pick<DrivePhoto, 'appProperties'>,
  filter: TagFilter,
): boolean {
  if (isEmptyFilter(filter)) return true
  const own = new Set(photoTags(photo))
  if (filter.exclude.some((tag) => own.has(tag))) return false
  if (filter.tags.length === 0) return true
  return filter.match === 'all'
    ? filter.tags.every((tag) => own.has(tag))
    : filter.tags.some((tag) => own.has(tag))
}

export function matchesFilters(
  photo: Pick<DrivePhoto, 'appProperties'>,
  filters: readonly TagFilter[],
): boolean {
  return filters.every((filter) => matchesTags(photo, filter))
}

export type TagState = 'include' | 'exclude' | 'off'

export function tagState(filter: TagFilter, tag: string): TagState {
  if (filter.tags.includes(tag)) return 'include'
  if (filter.exclude.includes(tag)) return 'exclude'
  return 'off'
}

/** Off, then include, then exclude, then back to off. */
export function cycleTag(filter: TagFilter, tag: string): TagFilter {
  const without = (list: readonly string[]) => list.filter((t) => t !== tag)
  switch (tagState(filter, tag)) {
    case 'off':
      return { ...filter, tags: [...filter.tags, tag] }
    case 'include':
      return {
        ...filter,
        tags: without(filter.tags),
        exclude: [...filter.exclude, tag],
      }
    case 'exclude':
      return { ...filter, exclude: without(filter.exclude) }
  }
}

/** Drops tags not in `known`; returns the same object when nothing changes. */
export function pruneFilter(
  filter: TagFilter,
  known: ReadonlySet<string>,
): TagFilter {
  const tags = filter.tags.filter((tag) => known.has(tag))
  const exclude = filter.exclude.filter((tag) => known.has(tag))
  return tags.length === filter.tags.length &&
    exclude.length === filter.exclude.length
    ? filter
    : { ...filter, tags, exclude }
}
