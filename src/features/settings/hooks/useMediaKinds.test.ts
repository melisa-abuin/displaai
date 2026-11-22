import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMediaKinds } from './useMediaKinds'

describe('useMediaKinds', () => {
  beforeEach(() => window.localStorage.clear())

  it('stores the chosen kinds in a stable order', () => {
    const { result } = renderHook(() => useMediaKinds())
    act(() => result.current[1](new Set(['videos', 'images'])))
    expect(window.localStorage.getItem('drive-photos:media-kinds')).toBe(
      '["images","videos"]',
    )
    expect([...result.current[0]]).toEqual(['images', 'videos'])
  })
})
