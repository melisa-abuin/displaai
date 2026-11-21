import { describe, expect, it } from 'vitest'
import { isHeic, normalizeTag, photoTags, tagProperties } from './api'

describe('normalizeTag', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTag('  big   beach \n day ')).toBe('big beach day')
  })

  it('rejects empty tags', () => {
    expect(normalizeTag('   ')).toBeUndefined()
  })

  it("rejects tags that would exceed Drive's property size limit", () => {
    expect(normalizeTag('a'.repeat(50))).toBe('a'.repeat(50))
    expect(normalizeTag('a'.repeat(200))).toBeUndefined()
    // Limits are in bytes, not characters.
    expect(normalizeTag('é'.repeat(60))).toBeUndefined()
  })
})

describe('photoTags / tagProperties', () => {
  const photo = {
    appProperties: { 'tag.2': 'beach', 'tag.1': 'Album', other: 'ignored' },
  }

  it('lists only tag values, sorted', () => {
    expect(photoTags(photo)).toEqual(['Album', 'beach'])
    expect(photoTags({})).toEqual([])
  })

  it('keeps only the tag properties', () => {
    expect(tagProperties(photo)).toEqual({
      'tag.2': 'beach',
      'tag.1': 'Album',
    })
  })
})

describe('isHeic', () => {
  it('detects HEIC/HEIF by type or extension', () => {
    expect(isHeic({ mimeType: 'image/heic', name: 'a' })).toBe(true)
    expect(
      isHeic({ mimeType: 'application/octet-stream', name: 'a.HEIF' }),
    ).toBe(true)
    expect(isHeic({ mimeType: 'image/jpeg', name: 'a.jpg' })).toBe(false)
  })
})
