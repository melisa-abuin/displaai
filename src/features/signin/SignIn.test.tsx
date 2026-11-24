import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context'
import type { AuthState } from '../../interfaces'
import { SignIn } from './SignIn'

function renderSignIn(auth: Partial<AuthState> = {}) {
  const value: AuthState = {
    token: null,
    error: null,
    isConfigured: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...auth,
  }
  render(
    <AuthContext.Provider value={value}>
      <SignIn />
    </AuthContext.Provider>,
  )
  return value
}

describe('SignIn', () => {
  it('signs in when the button is clicked', async () => {
    const { signIn } = renderSignIn()
    await userEvent.click(
      screen.getByRole('button', { name: 'Sign in with Google' }),
    )
    expect(signIn).toHaveBeenCalledOnce()
  })

  it('styles the title with its own class', () => {
    renderSignIn()
    const title = screen.getByRole('heading', { level: 1, name: 'Displaai' })
    expect(title.className).toMatch(/title/)
  })

  it('keeps the footer to two links and the source code in the dialog', () => {
    renderSignIn()
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getAllByRole('link')).toHaveLength(1)
    expect(
      within(footer).getByRole('button', { name: 'Information' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'source code', hidden: true }),
    ).toHaveAttribute(
      'href',
      'https://github.com/melisa-abuin/drive-photos-displayer',
    )
  })

  it('shows the auth error and the missing client id hint', () => {
    renderSignIn({ error: 'Nope', isConfigured: false })
    expect(screen.getByText('Nope')).toBeInTheDocument()
    expect(screen.getByText('VITE_GOOGLE_CLIENT_ID')).toBeInTheDocument()
  })
})
