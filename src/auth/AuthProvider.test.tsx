import { QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '../queryClient'
import { AuthProvider } from './AuthProvider'
import { POPUP_CLOSED_ERROR } from './constants'
import { useAuth } from './context'
import { requestAccessToken } from './gis'
import type { AuthState } from '../interfaces'

vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  CLIENT_ID: 'client-id',
}))
vi.mock('./gis', () => ({
  requestAccessToken: vi.fn(),
  revokeAccessToken: vi.fn(),
}))

let auth: AuthState

function Probe() {
  auth = useAuth()
  return null
}

function renderProvider() {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('AuthProvider signIn', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(requestAccessToken).mockReset()
  })

  it('does not report an error when the popup is closed', async () => {
    vi.mocked(requestAccessToken).mockRejectedValue(
      new Error(POPUP_CLOSED_ERROR),
    )
    renderProvider()
    await act(() => auth.signIn())
    expect(auth.error).toBeNull()
  })

  it('reports other sign-in errors', async () => {
    vi.mocked(requestAccessToken).mockRejectedValue(new Error('access_denied'))
    renderProvider()
    await act(() => auth.signIn())
    expect(auth.error).toBe('access_denied')
  })
})
