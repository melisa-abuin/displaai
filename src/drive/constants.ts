export const API = 'https://www.googleapis.com/drive/v3'

export const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export const BATCH_API = 'https://www.googleapis.com/batch/drive/v3'

// Videos are indexed too; what is shown is decided by the media types setting.
export const MEDIA_QUERY =
  "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false"

export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const PHOTO_FIELDS =
  'id, name, mimeType, parents, thumbnailLink, createdTime, size, appProperties, imageMediaMetadata(location, time, width, height)'

export const FOLDER_FIELDS = 'id, name, parents, ownedByMe'

/** Drive's limit of calls per batch request. */
export const THUMBNAIL_BATCH_SIZE = 100

// Drive only allows [a-zA-Z0-9.!@$%^&*()-_/] in property keys, so the tag's
// name lives in the value and the key is a hash of its lowercased name.
export const TAG_PREFIX = 'tag.'

export const TAG_KEY_LENGTH = TAG_PREFIX.length + 14

// Drive limits an app property's key + value to 124 bytes.
export const MAX_TAG_BYTES = 124 - TAG_KEY_LENGTH

export const SYNC_STALE_MS = 1000 * 60 * 15 // 15 minutes

export const BULK_TAG_CONCURRENCY = 4

export const DB_NAME = 'drive-photos-displayer'

export const DB_VERSION = 3

export const PHOTOS_STORE = 'photos'

export const FOLDERS_STORE = 'folders'

export const META_STORE = 'meta'

export const START_PAGE_TOKEN_KEY = 'startPageToken'

// Indexes written before videos were included lack this and are rebuilt.
export const SCOPE_KEY = 'scope'

export const LIBRARY_SCOPE = 'media-v1'

// Drive's thumbnail links stop working after a while; refresh well before that.
export const THUMBNAIL_TTL_MS = 1000 * 60 * 30

export const THUMBNAIL_CONCURRENCY = 2

/** How long a photo whose link refresh failed waits before it is tried again. */
export const THUMBNAIL_RETRY_MS = 1000 * 15
