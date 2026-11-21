import { describe, expect, it } from 'vitest'
import type { DrivePhoto } from './interfaces'
import { monthOf, sortByDate } from './photoSort'

const photo = (
  id: string,
  createdTime?: string,
  taken?: string,
): DrivePhoto => ({
  id,
  name: `${id}.jpg`,
  mimeType: 'image/jpeg',
  createdTime,
  imageMediaMetadata: taken ? { time: taken } : undefined,
})

const ids = (items: { item: DrivePhoto }[]) => items.map((d) => d.item.id)
const identity = (p: DrivePhoto) => p

describe('sortByDate', () => {
  const photos = [
    photo('b', '2024-02-01T00:00:00Z'),
    photo('undated'),
    photo('a', '2024-01-01T00:00:00Z'),
    photo('c', '2024-03-01T00:00:00Z'),
  ]

  it('sorts both directions and keeps undated photos last', () => {
    expect(ids(sortByDate(photos, identity, 'added-asc'))).toEqual([
      'a',
      'b',
      'c',
      'undated',
    ])
    expect(ids(sortByDate(photos, identity, 'added-desc'))).toEqual([
      'c',
      'b',
      'a',
      'undated',
    ])
  })

  it('orders by capture time, falling back to the added time', () => {
    const items = [
      photo('late-upload', '2024-06-01T00:00:00Z', '2020:01:01 10:00:00'),
      photo('no-exif', '2022-01-01T00:00:00Z'),
    ]
    expect(ids(sortByDate(items, identity, 'taken-asc'))).toEqual([
      'late-upload',
      'no-exif',
    ])
    expect(ids(sortByDate(items, identity, 'added-asc'))).toEqual([
      'no-exif',
      'late-upload',
    ])
  })
})

describe('monthOf', () => {
  it('gives consecutive keys across a year boundary', () => {
    const dec = monthOf(new Date(2023, 11, 31).getTime())
    const jan = monthOf(new Date(2024, 0, 1).getTime())
    expect(jan.key - dec.key).toBe(1)
    expect(jan.year).toBe(2024)
  })

  it('files undated photos under their own key', () => {
    expect(monthOf(undefined)).toMatchObject({ key: -1, label: 'No date' })
  })
})
