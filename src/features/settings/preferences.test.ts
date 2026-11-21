import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMediaKinds,
  useGallerySort,
  useLocalAi,
  useMediaKinds,
  useTimeline,
} from './preferences'

describe('settings', () => {
  beforeEach(() => window.localStorage.clear())

  it('has the documented defaults', () => {
    expect(renderHook(() => useLocalAi()).result.current[0]).toBe(false)
    expect(renderHook(() => useTimeline()).result.current[0]).toBe(true)
    expect(renderHook(() => useGallerySort()).result.current[0]).toBe(
      'taken-desc',
    )
    expect([...getMediaKinds()]).toEqual(['images'])
  })

  it('persists a changed setting', () => {
    const { result } = renderHook(() => useTimeline())
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
    expect(window.localStorage.getItem('drive-photos:timeline')).toBe('false')
  })

  it('falls back to the default for an unknown sort order', () => {
    window.localStorage.setItem('drive-photos:sort', 'sideways')
    const { result } = renderHook(() => useGallerySort())
    expect(result.current[0]).toBe('taken-desc')
  })

  describe('media kinds', () => {
    it('falls back to images when the stored value is unusable', () => {
      window.localStorage.setItem('drive-photos:media-kinds', '["audio"]')
      expect([...getMediaKinds()]).toEqual(['images'])
      window.localStorage.setItem('drive-photos:media-kinds', '{bad')
      expect([...getMediaKinds()]).toEqual(['images'])
    })

    it('stores the chosen kinds in a stable order', () => {
      const { result } = renderHook(() => useMediaKinds())
      act(() => result.current[1](new Set(['videos', 'images'])))
      expect(window.localStorage.getItem('drive-photos:media-kinds')).toBe(
        '["images","videos"]',
      )
      expect([...result.current[0]]).toEqual(['images', 'videos'])
    })
  })
})
