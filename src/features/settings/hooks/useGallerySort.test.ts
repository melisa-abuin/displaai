import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGallerySort } from './useGallerySort'

describe('useGallerySort', () => {
  beforeEach(() => window.localStorage.clear())

  it('sorts by date taken, newest first, by default', () => {
    expect(renderHook(() => useGallerySort()).result.current[0]).toBe(
      'taken-desc',
    )
  })

  it('falls back to the default for an unknown sort order', () => {
    window.localStorage.setItem('drive-photos:sort', 'sideways')
    const { result } = renderHook(() => useGallerySort())
    expect(result.current[0]).toBe('taken-desc')
  })
})
