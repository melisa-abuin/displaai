import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VirtuosoMockContext } from 'react-virtuoso'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthContext, type AuthState } from './auth/context'
import { queryClient } from './queryClient'

function renderApp(auth: Partial<AuthState>) {
  const value: AuthState = {
    token: null,
    error: null,
    isConfigured: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...auth,
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <VirtuosoMockContext.Provider
          value={{ viewportHeight: 800, itemHeight: 180 }}
        >
          <App />
        </VirtuosoMockContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('shows the sign-in screen when signed out', () => {
    renderApp({})
    expect(
      screen.getByRole('button', { name: 'Sign in with Google' }),
    ).toBeInTheDocument()
  })

  it('renders the sidebar with image albums only, and photos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const q = new URL(url).searchParams
        const query = q.get('q') ?? ''
        let files: unknown[]
        if (query.includes('google-apps.folder')) {
          files = [
            { id: 'f0', name: 'Trips' },
            { id: 'f1', name: 'Holidays', parents: ['f0'] },
            { id: 'f2', name: '1d' },
          ]
        } else if (q.get('fields')?.includes('parents')) {
          files = [{ parents: ['f1'] }, { parents: ['f1'] }]
        } else {
          files = [{ id: 'p1', name: 'beach.jpg', mimeType: 'image/jpeg' }]
        }
        return new Response(JSON.stringify({ files }), { status: 200 })
      }),
    )
    window.localStorage.setItem(
      'drive-photos:connected-folders',
      JSON.stringify([{ id: 'f1', recursive: false }]),
    )
    renderApp({ token: 'abc' })

    expect(
      await screen.findByRole('button', { name: 'Holidays 2' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'beach.jpg' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /1d/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'All photos' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('All photos \u2013 Displai')
    await userEvent.click(screen.getByRole('button', { name: 'Holidays 2' }))
    expect(
      await screen.findByRole('heading', { name: 'Trips / Holidays' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Trips / Holidays \u2013 Displai')
    expect(window.location.pathname).toBe('/albums/f1')
    vi.unstubAllGlobals()
  })

  it('reflects the browsed subfolder in the folder manager URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const q = new URL(url).searchParams
        let files: unknown[]
        if ((q.get('q') ?? '').includes('google-apps.folder')) {
          files = [
            { id: 'f0', name: 'Trips' },
            { id: 'f1', name: 'Holidays', parents: ['f0'] },
          ]
        } else if (q.get('fields')?.includes('parents')) {
          files = [{ parents: ['f1'] }]
        } else {
          files = []
        }
        return new Response(JSON.stringify({ files }), { status: 200 })
      }),
    )
    queryClient.clear()
    window.history.replaceState(null, '', '/settings/folders')
    renderApp({ token: 'abc' })

    await userEvent.click(await screen.findByRole('button', { name: /Trips/ }))
    expect(window.location.pathname).toBe('/settings/folders/f0')
    expect(screen.getByRole('button', { name: 'My Drive' })).toBeInTheDocument()
    expect(await screen.findByText('Holidays')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'My Drive' }))
    expect(window.location.pathname).toBe('/settings/folders')
    vi.unstubAllGlobals()
  })

  it('shows the email in the sidebar and a settings page with log out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url.includes('/about')
          ? { user: { emailAddress: 'me@example.com' } }
          : { files: [] }
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )
    const signOut = vi.fn()
    queryClient.clear()
    renderApp({ token: 'abc', signOut })

    expect(await screen.findByText('me@example.com')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/settings/folders')
    expect(
      screen.queryByRole('button', { name: 'Sign out' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(window.location.pathname).toBe('/settings')
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(signOut).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
