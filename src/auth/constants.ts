export const GIS_SRC = 'https://accounts.google.com/gsi/client'

// Full access is needed to replace the contents of an existing photo with its edited version.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export const TOKEN_STORAGE_KEY = 'drive-photos-displayer:token'

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Error type Google reports when the user closes the sign-in popup.
export const POPUP_CLOSED_ERROR = 'popup_closed'
