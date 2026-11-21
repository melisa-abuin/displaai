import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConnectedFolders } from './connectedFolders'

const KEY = 'drive-photos:connected-folders'

describe('useConnectedFolders', () => {
  beforeEach(() => window.localStorage.clear())

  it("upgrades the first version's plain id list", () => {
    window.localStorage.setItem(KEY, JSON.stringify(['a', { id: 'b' }, 7]))
    const { result } = renderHook(() => useConnectedFolders())
    expect(result.current.entries).toEqual([
      { id: 'a', recursive: false },
      { id: 'b', recursive: false },
    ])
  })

  it('ignores corrupt storage', () => {
    window.localStorage.setItem(KEY, '{nope')
    const { result } = renderHook(() => useConnectedFolders())
    expect(result.current.entries).toEqual([])
  })

  it('connects, changes mode and disconnects a folder', () => {
    const { result } = renderHook(() => useConnectedFolders())
    act(() => result.current.setFolder('a', false))
    act(() => result.current.setFolder('a', true))
    expect(result.current.entries).toEqual([{ id: 'a', recursive: true }])
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([
      { id: 'a', recursive: true },
    ])

    act(() => result.current.setFolder('a', null))
    expect(result.current.entries).toEqual([])
  })
})
