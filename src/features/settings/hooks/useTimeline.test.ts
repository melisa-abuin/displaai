import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTimeline } from './useTimeline'

describe('useTimeline', () => {
  beforeEach(() => window.localStorage.clear())

  it('is on by default', () => {
    expect(renderHook(() => useTimeline()).result.current[0]).toBe(true)
  })

  it('persists a changed setting', () => {
    const { result } = renderHook(() => useTimeline())
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
    expect(window.localStorage.getItem('drive-photos:timeline')).toBe('false')
  })
})
