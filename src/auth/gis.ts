const GIS_SRC = 'https://accounts.google.com/gsi/client'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

export interface AccessToken {
  value: string
  expiresAt: number
}

let scriptPromise: Promise<void> | undefined

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = undefined
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Opens the Google consent popup and resolves with a Drive access token. */
export async function requestAccessToken(
  clientId: string,
  options: { prompt?: '' | 'consent' } = {},
): Promise<AccessToken> {
  await loadGis()
  return new Promise<AccessToken>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? response.error))
          return
        }
        resolve({
          value: response.access_token,
          expiresAt: Date.now() + Number(response.expires_in) * 1000,
        })
      },
      error_callback: (error) => reject(new Error(error.type)),
    })
    client.requestAccessToken({ prompt: options.prompt ?? '' })
  })
}

export async function revokeAccessToken(token: string): Promise<void> {
  await loadGis()
  return new Promise((resolve) => {
    google.accounts.oauth2.revoke(token, () => resolve())
  })
}
