import type { TagMatch, ViewMode } from '../../interfaces'

// Keep in sync with the breakpoint in index.css and Sidebar.module.css.
export const MOBILE_QUERY = '(max-width: 640px)'

/** Indentation added per nesting level of the folder list. */
export const FOLDER_INDENT_PX = 14

export const VIEW_MODE_OPTIONS: readonly { value: ViewMode; label: string }[] =
  [
    { value: 'photos', label: 'Photos' },
    { value: 'map', label: 'Map' },
  ]

export const TAG_MATCH_OPTIONS: readonly { value: TagMatch; label: string }[] =
  [
    { value: 'any', label: 'Any' },
    { value: 'all', label: 'All' },
  ]
