import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseRoute, paths, useFilters, useNavigate } from './router'

describe('parseRoute', () => {
  it.each([
    ['/', { name: 'gallery' }],
    ['/settings', { name: 'settings' }],
    ['/map', { name: 'map' }],
    ['/map/f1', { name: 'map', folderId: 'f1' }],
    ['/map/views/v1', { name: 'map', viewId: 'v1' }],
    ['/albums/f1', { name: 'album', folderId: 'f1' }],
    ['/views/v1', { name: 'view', viewId: 'v1' }],
    ['/peek/f1', { name: 'peek', folderId: 'f1' }],
    ['/settings/views', { name: 'views', viewId: undefined }],
    ['/settings/views/v1', { name: 'views', viewId: 'v1' }],
    ['/settings/folders', { name: 'folders', path: [] }],
    ['/settings/folders/a/b', { name: 'folders', path: ['a', 'b'] }],
    ['/nothing/here', { name: 'notFound' }],
    ['/albums', { name: 'notFound' }],
  ])('%s', (pathname, route) => {
    expect(parseRoute(pathname)).toEqual(route)
  })

  it('round-trips ids that need escaping', () => {
    const id = 'a/b c?d'
    expect(parseRoute(paths.album(id))).toEqual({ name: 'album', folderId: id })
    expect(parseRoute(paths.foldersAt([id, 'x']))).toEqual({
      name: 'folders',
      path: [id, 'x'],
    })
  })

  it('treats malformed escapes as not found instead of throwing', () => {
    expect(parseRoute('/albums/%E0%A4%A')).toEqual({ name: 'notFound' })
    expect(parseRoute('/settings/folders/%')).toEqual({ name: 'notFound' })
  })
})

describe('useFilters', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  it('reads filters from the URL, ignoring duplicates and clashes', () => {
    window.history.replaceState(null, '', '/?tag=a&tag=a&tag=b&not=a&not=c')
    const { result } = renderHook(() => useFilters())
    expect(result.current[0]).toEqual({
      tags: ['a', 'b'],
      exclude: ['c'],
      match: 'any',
    })
  })

  it('writes filters to the URL without adding history entries', () => {
    const before = window.history.length
    const { result } = renderHook(() => useFilters())
    act(() =>
      result.current[1]({ tags: ['a', 'b'], exclude: ['c'], match: 'all' }),
    )
    expect(window.location.search).toBe('?tag=a&tag=b&not=c&match=all')
    expect(result.current[0].match).toBe('all')

    // "all" is meaningless with a single tag, so it isn't kept.
    act(() => result.current[1]({ tags: ['a'], exclude: [], match: 'all' }))
    expect(window.location.search).toBe('?tag=a')
    expect(window.history.length).toBe(before)
  })
})

describe('useNavigate', () => {
  it('drops the filters when changing page', () => {
    window.history.replaceState(null, '', '/?tag=a')
    const { result } = renderHook(() => useNavigate())
    act(() => result.current('/map'))
    expect(window.location.pathname).toBe('/map')
    expect(window.location.search).toBe('')
  })
})
