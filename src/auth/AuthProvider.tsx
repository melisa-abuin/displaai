import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './context'
import { requestAccessToken, revokeAccessToken, type AccessToken } from './gis'

const STORAGE_KEY = 'drive-photos-displayer:token'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function loadStoredToken(): AccessToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const token = JSON.parse(raw) as AccessToken
    return token.expiresAt > Date.now() ? token : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<AccessToken | null>(loadStoredToken)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token))
    const timeout = setTimeout(
      () => setToken(null),
      Math.max(token.expiresAt - Date.now(), 0),
    )
    return () => clearTimeout(timeout)
  }, [token])

  const signIn = useCallback(async () => {
    if (!CLIENT_ID) {
      setError('Missing VITE_GOOGLE_CLIENT_ID. See the README.')
      return
    }
    setError(null)
    try {
      setToken(await requestAccessToken(CLIENT_ID))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    }
  }, [])

  const signOut = useCallback(async () => {
    const current = token
    setToken(null)
    queryClient.clear()
    if (current) await revokeAccessToken(current.value)
  }, [token, queryClient])

  const value = useMemo(
    () => ({
      token: token?.value ?? null,
      error,
      isConfigured: Boolean(CLIENT_ID),
      signIn,
      signOut,
    }),
    [token, error, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
