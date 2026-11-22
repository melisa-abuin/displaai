import { beforeEach, describe, expect, it } from 'vitest'
import { getMediaKinds } from './mediaKinds'

describe('getMediaKinds', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows images only by default', () => {
    expect([...getMediaKinds()]).toEqual(['images'])
  })

  it('falls back to images when the stored value is unusable', () => {
    window.localStorage.setItem('drive-photos:media-kinds', '["audio"]')
    expect([...getMediaKinds()]).toEqual(['images'])
    window.localStorage.setItem('drive-photos:media-kinds', '{bad')
    expect([...getMediaKinds()]).toEqual(['images'])
  })
})
