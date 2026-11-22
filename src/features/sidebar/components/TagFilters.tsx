import { memo } from 'react'
import { cycleTag, tagState } from '../../../drive/tagFilter'
import type { TagCount } from '../../../interfaces'
import { formatNumber } from '../../../lib/format'
import { useFilters } from '../../../lib/router'
import { ChevronIcon } from '../../../ui/icons/Icons'
import { TAG_MATCH_OPTIONS } from '../constants'
import styles from '../Sidebar.module.css'

interface TagFiltersProps {
  tags: TagCount[] | undefined
  isOpen: boolean
  onToggle: () => void
}

/** The tag filter; its selection lives in the URL. */
export const TagFilters = memo(function TagFilters({
  tags,
  isOpen,
  onToggle,
}: TagFiltersProps) {
  const [filter, setFilter] = useFilters()
  if (!tags || tags.length === 0) return null

  const selectedCount = filter.tags.length + filter.exclude.length

  return (
    <section className={styles.filters} aria-label="Filter by tag">
      <div className={styles.filtersHeader}>
        <h2 className={styles.filtersTitle}>
          <button
            type="button"
            className={styles.filtersToggle}
            aria-expanded={isOpen}
            onClick={onToggle}
          >
            <ChevronIcon className={isOpen ? styles.chevronOpen : undefined} />
            Tags
          </button>
        </h2>
        {selectedCount > 0 && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => setFilter({ ...filter, tags: [], exclude: [] })}
          >
            Clear
          </button>
        )}
      </div>
      {isOpen && filter.tags.length > 1 && (
        <div className={styles.match} role="group" aria-label="Match">
          {TAG_MATCH_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={styles.matchOption}
              aria-pressed={filter.match === value}
              onClick={() => setFilter({ ...filter, match: value })}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {isOpen && (
        <ul className={styles.tagList}>
          {tags.map((tag) => {
            const state = tagState(filter, tag.name)
            return (
              <li key={tag.name}>
                <button
                  type="button"
                  className={styles.tag}
                  aria-pressed={state !== 'off'}
                  data-state={state}
                  title={`${tag.name}${state === 'exclude' ? ' (excluded)' : ''}`}
                  onClick={() => setFilter(cycleTag(filter, tag.name))}
                >
                  <span className={styles.name}>
                    {state === 'exclude' ? 'Not ' : ''}
                    {tag.name}
                  </span>{' '}
                  <span className={styles.count}>
                    {formatNumber(tag.count)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
})
