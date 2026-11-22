import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocalAi } from './useLocalAi'

describe('useLocalAi', () => {
  beforeEach(() => window.localStorage.clear())

  it('is off by default', () => {
    expect(renderHook(() => useLocalAi()).result.current[0]).toBe(false)
  })
})
