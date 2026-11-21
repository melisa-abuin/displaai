import { describe, expect, it } from 'vitest'
import type { TagFilter } from '../interfaces'
import { cycleTag, matchesFilters, pruneFilter } from './tagFilter'

const withTags = (...names: string[]) => ({
  appProperties: Object.fromEntries(names.map((n, i) => [`tag.${i}`, n])),
})

const filter = (changes: Partial<TagFilter>): TagFilter => ({
  tags: [],
  exclude: [],
  match: 'any',
  ...changes,
})

describe('matchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(matchesFilters(withTags(), [filter({})])).toBe(true)
  })

  it('"any" needs one included tag, "all" needs every one', () => {
    const photo = withTags('beach', 'family')
    expect(matchesFilters(photo, [filter({ tags: ['beach', 'city'] })])).toBe(
      true,
    )
    expect(
      matchesFilters(photo, [
        filter({ tags: ['beach', 'city'], match: 'all' }),
      ]),
    ).toBe(false)
    expect(
      matchesFilters(photo, [
        filter({ tags: ['beach', 'family'], match: 'all' }),
      ]),
    ).toBe(true)
  })

  it('always drops photos with an excluded tag', () => {
    const photo = withTags('beach', 'blurry')
    expect(
      matchesFilters(photo, [filter({ tags: ['beach'], exclude: ['blurry'] })]),
    ).toBe(false)
    expect(matchesFilters(photo, [filter({ exclude: ['blurry'] })])).toBe(false)
    expect(
      matchesFilters(withTags('beach'), [filter({ exclude: ['x'] })]),
    ).toBe(true)
  })

  it('requires every filter to match', () => {
    const photo = withTags('beach')
    expect(
      matchesFilters(photo, [
        filter({ tags: ['beach'] }),
        filter({ tags: ['city'] }),
      ]),
    ).toBe(false)
  })
})

describe('cycleTag', () => {
  it('goes off, include, exclude, off', () => {
    const included = cycleTag(filter({}), 'a')
    expect(included).toMatchObject({ tags: ['a'], exclude: [] })
    const excluded = cycleTag(included, 'a')
    expect(excluded).toMatchObject({ tags: [], exclude: ['a'] })
    expect(cycleTag(excluded, 'a')).toMatchObject({ tags: [], exclude: [] })
  })
})

describe('pruneFilter', () => {
  it('drops unknown tags', () => {
    const pruned = pruneFilter(
      filter({ tags: ['a', 'gone'], exclude: ['b', 'gone'] }),
      new Set(['a', 'b']),
    )
    expect(pruned).toMatchObject({ tags: ['a'], exclude: ['b'] })
  })

  it('returns the same object when nothing changes', () => {
    const original = filter({ tags: ['a'] })
    expect(pruneFilter(original, new Set(['a']))).toBe(original)
  })
})
