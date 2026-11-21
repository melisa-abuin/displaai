import { describe, expect, it } from 'vitest'
import {
  cropForRatio,
  croppedSize,
  fileStem,
  orientedSize,
  outputSize,
} from './edit'

describe('fileStem', () => {
  it('removes only the last extension', () => {
    expect(fileStem('holiday.heic')).toBe('holiday')
    expect(fileStem('a.b.jpg')).toBe('a.b')
    expect(fileStem('noext')).toBe('noext')
  })
})

describe('cropForRatio', () => {
  it('keeps the full height of a wide image for a narrower ratio', () => {
    const crop = cropForRatio(1, { w: 300, h: 200 })
    expect(crop.h).toBe(1)
    expect(crop.w).toBeCloseTo(2 / 3)
    expect(crop.x).toBeCloseTo(1 / 6)
  })

  it('keeps the full width for a wider ratio', () => {
    const crop = cropForRatio(2, { w: 300, h: 200 })
    expect(crop.w).toBe(1)
    expect(crop.h).toBeCloseTo(0.75)
    expect(crop.y).toBeCloseTo(0.125)
  })
})

describe('sizes', () => {
  const source = { width: 400, height: 200 }
  const full = { x: 0, y: 0, w: 1, h: 1 }

  it('swaps the dimensions for quarter turns', () => {
    expect(orientedSize(source, 0)).toEqual({ w: 400, h: 200 })
    expect(orientedSize(source, 1)).toEqual({ w: 200, h: 400 })
    expect(orientedSize(source, 2)).toEqual({ w: 400, h: 200 })
  })

  it('applies the crop to the rotated image', () => {
    expect(
      croppedSize(source, { rotate: 1, crop: { x: 0, y: 0, w: 0.5, h: 0.25 } }),
    ).toEqual({ w: 100, h: 100 })
  })

  it('resizes to the requested width keeping proportions', () => {
    expect(outputSize(source, { rotate: 0, crop: full, width: 100 })).toEqual({
      w: 100,
      h: 50,
    })
  })

  it('caps the output size, keeping proportions', () => {
    const out = outputSize(source, { rotate: 0, crop: full, width: 100000 })
    expect(out.w).toBeLessThan(100000)
    expect(out.w / out.h).toBeCloseTo(2)
  })
})
