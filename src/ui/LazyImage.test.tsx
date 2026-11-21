import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LazyImage } from './LazyImage'

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

describe('LazyImage', () => {
  let trigger: ObserverCallback
  const disconnect = vi.fn()

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: ObserverCallback) {
          trigger = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    disconnect.mockClear()
  })

  it('does not load the image until it scrolls into view', () => {
    render(<LazyImage src="/photo.jpg" alt="A photo" />)
    expect(screen.getByAltText('A photo')).not.toHaveAttribute('src')

    act(() => trigger([{ isIntersecting: false }]))
    expect(screen.getByAltText('A photo')).not.toHaveAttribute('src')

    act(() => trigger([{ isIntersecting: true }]))
    expect(screen.getByAltText('A photo')).toHaveAttribute('src', '/photo.jpg')
    expect(disconnect).toHaveBeenCalled()
  })
})
