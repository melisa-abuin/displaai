import { describe, expect, it } from 'vitest'
import { formatBytes, parseDate } from './format'

describe('parseDate', () => {
  it('reads the EXIF date format Drive reports', () => {
    const date = parseDate('2024:03:05 14:30:00')!
    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2024, 2, 5, 14, 30])
  })

  it('reads ISO dates', () => {
    expect(parseDate('2024-03-05T14:30:00Z')?.toISOString()).toBe(
      '2024-03-05T14:30:00.000Z',
    )
  })

  it('returns undefined for missing or invalid input', () => {
    expect(parseDate(undefined)).toBeUndefined()
    expect(parseDate('')).toBeUndefined()
    expect(parseDate('not a date')).toBeUndefined()
  })
})

describe('formatBytes', () => {
  it('formats each unit with sensible precision', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GB')
  })

  it('accepts the string sizes Drive returns', () => {
    expect(formatBytes('2048')).toBe('2.0 KB')
  })

  it('returns undefined when there is no usable size', () => {
    expect(formatBytes(undefined)).toBeUndefined()
    expect(formatBytes('unknown')).toBeUndefined()
  })
})
