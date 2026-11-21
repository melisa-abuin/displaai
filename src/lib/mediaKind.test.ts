import { describe, expect, it } from 'vitest'
import { isMediaKind, mediaKindOf } from './mediaKind'

describe('mediaKindOf', () => {
  it('separates GIFs and videos from images', () => {
    expect(mediaKindOf({ mimeType: 'image/gif' })).toBe('gifs')
    expect(mediaKindOf({ mimeType: 'IMAGE/GIF' })).toBe('gifs')
    expect(mediaKindOf({ mimeType: 'video/mp4' })).toBe('videos')
  })

  it('treats every other type as an image', () => {
    expect(mediaKindOf({ mimeType: 'image/heic' })).toBe('images')
    expect(mediaKindOf({ mimeType: 'application/octet-stream' })).toBe('images')
  })
})

describe('isMediaKind', () => {
  it('only accepts known kinds', () => {
    expect(isMediaKind('videos')).toBe(true)
    expect(isMediaKind('audio')).toBe(false)
    expect(isMediaKind(undefined)).toBe(false)
  })
})
