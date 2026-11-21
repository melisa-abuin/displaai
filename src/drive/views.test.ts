import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useViews } from './views'

const KEY = 'drive-photos:views'

describe('useViews', () => {
  beforeEach(() => window.localStorage.clear())

  it('sanitises stored views', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: 'v1', name: 'Trips' },
        {
          id: 'v2',
          name: 'Family',
          folders: [{ id: 'f', recursive: true }, { id: 5 }, null],
          tags: ['a', 3],
          exclude: 'nope',
          match: 'all',
        },
        { name: 'no id' },
        null,
      ]),
    )
    const { result } = renderHook(() => useViews())
    expect(result.current.views).toEqual([
      {
        id: 'v1',
        name: 'Trips',
        folders: [],
        tags: [],
        exclude: [],
        match: 'any',
      },
      {
        id: 'v2',
        name: 'Family',
        folders: [{ id: 'f', recursive: true }],
        tags: ['a'],
        exclude: [],
        match: 'all',
      },
    ])
  })

  it('adds, replaces and removes views', () => {
    const { result } = renderHook(() => useViews())
    const view = {
      id: 'v',
      name: 'One',
      folders: [],
      tags: [],
      exclude: [],
      match: 'any' as const,
    }
    act(() => result.current.saveView(view))
    act(() => result.current.saveView({ ...view, name: 'Renamed' }))
    expect(result.current.views).toEqual([{ ...view, name: 'Renamed' }])

    act(() => result.current.removeView('v'))
    expect(result.current.views).toEqual([])
  })
})
