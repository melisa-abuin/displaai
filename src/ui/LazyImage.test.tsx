import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LazyImage } from './LazyImage'

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

function placeAt(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
  } as DOMRect)
}

describe('LazyImage', () => {
  let trigger: ObserverCallback

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: ObserverCallback) {
          trigger = callback
        }
        observe() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads an image that is on screen right away, with high priority', () => {
    placeAt(10)
    render(<LazyImage src="/photo.jpg" alt="A photo" />)
    const image = screen.getByAltText('A photo')
    expect(image).toHaveAttribute('src', '/photo.jpg')
    expect(image).toHaveAttribute('fetchpriority', 'high')
  })

  it('waits for an image below the screen until it gets close', () => {
    placeAt(window.innerHeight + 1000)
    render(<LazyImage src="/photo.jpg" alt="A photo" />)
    expect(screen.getByAltText('A photo')).not.toHaveAttribute('src')

    act(() => trigger([{ isIntersecting: false }]))
    expect(screen.getByAltText('A photo')).not.toHaveAttribute('src')

    act(() => trigger([{ isIntersecting: true }]))
    expect(screen.getByAltText('A photo')).toHaveAttribute('src', '/photo.jpg')
  })
})
