import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadApp } from '../queryClient'
import { ErrorBoundary } from './ErrorBoundary'

vi.mock('../queryClient', () => ({ reloadApp: vi.fn() }))

function Broken(): never {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('shows a fallback with revealable details and a way to reload', async () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show error' }))
    expect(screen.getByText(/kaboom/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hide details' }))
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Clear & refresh' }),
    )
    expect(reloadApp).toHaveBeenCalled()
  })
})
