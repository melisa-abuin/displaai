import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { queryClient } from './queryClient'

describe('App', () => {
  it('renders the heading', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'drive-photos-displayer' }),
    ).toBeInTheDocument()
  })
})
