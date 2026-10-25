const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export interface DriveFolder {
  id: string
  name: string
  parentId?: string
  path: string
  /** False for folders other people shared with you. */
  ownedByMe: boolean
  /** Images directly inside this folder (not in subfolders). */
  photoCount: number
  /** Images in this folder and all of its subfolders. */
  totalCount: number
}

export interface DrivePhoto {
  id: string
  name: string
  mimeType: string
  /** Ids of the folders containing the photo; always present for photos from the local index. */
  parents?: string[]
  thumbnailLink?: string
  /** When `thumbnailLink` was fetched (ms); the link expires after a while. */
  thumbnailAt?: number
  /** Present only when the image has EXIF data (GPS may be missing). */
  imageMediaMetadata?: {
    location?: { latitude: number; longitude: number; altitude?: number }
    time?: string
    width?: number
    height?: number
  }
  createdTime?: string
  /** Bytes, as a string (Drive's format). */
  size?: string
  /** Custom properties private to this app; tags are stored as 'tag.<hash>' keys holding the tag name. */
  appProperties?: Record<string, string>
}

export interface TagCount {
  name: string
  count: number
}

export interface Library {
  folders: DriveFolder[]
  /** Every distinct tag used by any photo in the Drive. */
  tags: TagCount[]
}

/** A photo as kept in the local index. */
export interface IndexedPhoto extends DrivePhoto {
  parents: string[]
}

/** A folder as kept in the local index. */
export interface IndexedFolder {
  id: string
  name: string
  parents?: string[]
  ownedByMe: boolean
}

export interface PhotoPage {
  /** The folder all the photos of this page are in. */
  folderId?: string
  files: DrivePhoto[]
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Google Drive session expired')
  }
}

export class DriveHttpError extends Error {
  status: number
  constructor(status: number) {
    super(`Drive API error ${status}`)
    this.status = status
  }
}

async function driveFetch(
  token: string,
  path: string,
  params?: Record<string, string>,
  init?: {
    method?: string
    body?: BodyInit
    headers?: Record<string, string>
    base?: string
  },
): Promise<Response> {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`${init?.base ?? API}${path}${query}`, {
    method: init?.method,
    body: init?.body,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) throw new DriveHttpError(res.status)
  return res
}

export async function getUserEmail(token: string): Promise<string | undefined> {
  const res = await driveFetch(token, '/about', {
    fields: 'user(emailAddress)',
  })
  const data = (await res.json()) as { user?: { emailAddress?: string } }
  return data.user?.emailAddress
}

// Videos are indexed too; what is shown is decided by the media types setting.
const MEDIA_QUERY =
  "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false"

async function listAll<T>(
  token: string,
  params: Record<string, string>,
): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  do {
    const res = await driveFetch(token, '/files', {
      ...params,
      pageSize: '1000',
      ...(pageToken && { pageToken }),
    })
    const data = (await res.json()) as { files: T[]; nextPageToken?: string }
    items.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)
  return items
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const PHOTO_FIELDS =
  'id, name, mimeType, parents, thumbnailLink, createdTime, size, appProperties, imageMediaMetadata(location, time, width, height)'
const FOLDER_FIELDS = 'id, name, parents, ownedByMe'

type RawPhoto = Omit<IndexedPhoto, 'parents'> & { parents?: string[] }
type RawFolder = Omit<IndexedFolder, 'ownedByMe'> & { ownedByMe?: boolean }

const toPhoto = (file: RawPhoto): IndexedPhoto => ({
  ...file,
  parents: file.parents ?? [],
  thumbnailAt: Date.now(),
})

const BATCH_API = 'https://www.googleapis.com/batch/drive/v3'
/** Drive's limit of calls per batch request. */
export const THUMBNAIL_BATCH_SIZE = 100

/**
 * Fetches the thumbnail links of up to {@link THUMBNAIL_BATCH_SIZE} files in a
 * single HTTP request. Files whose sub-request failed are left out of the
 * result; a file without a thumbnail maps to `undefined`.
 */
export async function fetchThumbnailLinks(
  token: string,
  fileIds: readonly string[],
): Promise<Map<string, string | undefined>> {
  const result = new Map<string, string | undefined>()
  if (!fileIds.length) return result
  const boundary = `batch_${crypto.randomUUID()}`
  const body =
    fileIds
      .map(
        (id, i) =>
          `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <${i}>\r\n\r\n` +
          `GET /drive/v3/files/${encodeURIComponent(id)}?fields=thumbnailLink\r\n`,
      )
      .join('') + `--${boundary}--`
  const res = await driveFetch(token, '', undefined, {
    method: 'POST',
    base: BATCH_API,
    body,
    headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` },
  })
  const text = await res.text()
  const responseBoundary =
    /boundary=("?)([^";\s]+)\1/i.exec(
      res.headers.get('Content-Type') ?? '',
    )?.[2] ?? /^--(\S+)/.exec(text)?.[1]
  if (!responseBoundary) return result
  for (const part of text.split(`--${responseBoundary}`)) {
    const index = /Content-ID:\s*<response-(\d+)>/i.exec(part)?.[1]
    if (index === undefined) continue
    // Part headers, then the embedded HTTP response (status + headers), then its body.
    const [, inner = '', json = ''] = part.split(/\r?\n\r?\n/, 3)
    if (!/^HTTP\/\d(?:\.\d)?\s+2\d\d/.test(inner.trim())) continue
    try {
      const { thumbnailLink } = JSON.parse(json.trim()) as {
        thumbnailLink?: string
      }
      result.set(fileIds[Number(index)], thumbnailLink)
    } catch {
      // Treated as failed.
    }
  }
  return result
}

const toFolder = (file: RawFolder): IndexedFolder => ({
  id: file.id,
  name: file.name,
  parents: file.parents,
  ownedByMe: file.ownedByMe !== false,
})

/** Must be fetched before a full listing, so changes made during it aren't missed. */
export async function getStartPageToken(token: string): Promise<string> {
  const res = await driveFetch(token, '/changes/startPageToken')
  return ((await res.json()) as { startPageToken: string }).startPageToken
}

export async function listAllPhotos(token: string): Promise<IndexedPhoto[]> {
  const files = await listAll<RawPhoto>(token, {
    q: MEDIA_QUERY,
    fields: `nextPageToken, files(${PHOTO_FIELDS})`,
  })
  return files.map(toPhoto)
}

export async function listAllFolders(token: string): Promise<IndexedFolder[]> {
  const files = await listAll<RawFolder>(token, {
    q: `mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: `nextPageToken, files(${FOLDER_FIELDS})`,
  })
  return files.map(toFolder)
}

export interface ChangeSet {
  photos: IndexedPhoto[]
  folders: IndexedFolder[]
  /** Ids that are gone from Drive, trashed, or no longer an image, video or folder. */
  removedIds: string[]
  newStartPageToken: string
}

interface RawChange {
  fileId: string
  removed?: boolean
  file?: (RawPhoto & RawFolder) & { trashed?: boolean }
}

/** Everything that changed since `startPageToken`, sorted into upserts and removals. */
export async function listChanges(
  token: string,
  startPageToken: string,
): Promise<ChangeSet> {
  const photos = new Map<string, IndexedPhoto>()
  const folders = new Map<string, IndexedFolder>()
  const removed = new Set<string>()
  let pageToken = startPageToken
  let newStartPageToken: string | undefined
  while (!newStartPageToken) {
    const res = await driveFetch(token, '/changes', {
      pageToken,
      pageSize: '1000',
      includeRemoved: 'true',
      spaces: 'drive',
      fields: `nextPageToken, newStartPageToken, changes(fileId, removed, file(${PHOTO_FIELDS}, trashed, ownedByMe))`,
    })
    const data = (await res.json()) as {
      changes: RawChange[]
      nextPageToken?: string
      newStartPageToken?: string
    }
    // Later changes to the same file win.
    for (const { fileId, removed: gone, file } of data.changes) {
      photos.delete(fileId)
      folders.delete(fileId)
      removed.delete(fileId)
      if (gone || !file || file.trashed) removed.add(fileId)
      else if (file.mimeType === FOLDER_MIME)
        folders.set(fileId, toFolder(file))
      else if (/^(image|video)\//.test(file.mimeType))
        photos.set(fileId, toPhoto(file))
      else removed.add(fileId)
    }
    newStartPageToken = data.newStartPageToken
    if (!newStartPageToken) pageToken = data.nextPageToken!
  }
  return {
    photos: [...photos.values()],
    folders: [...folders.values()],
    removedIds: [...removed],
    newStartPageToken,
  }
}

export interface PhotoLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  thumbnailLink?: string
  thumbnailAt?: number
  /** The folder (album) the photo is in. */
  parentId?: string
  /** EXIF capture time, falling back to when the file was added. */
  date?: string
}

export async function fetchPhotoBlob(
  token: string,
  fileId: string,
): Promise<Blob> {
  const res = await driveFetch(token, `/files/${fileId}`, { alt: 'media' })
  return res.blob()
}

interface Box {
  type: string
  start: number
  end: number
}

function* boxes(v: DataView, start: number, end: number): Generator<Box> {
  let at = start
  while (at + 8 <= end) {
    let size = v.getUint32(at)
    const type = String.fromCharCode(
      ...[4, 5, 6, 7].map((i) => v.getUint8(at + i)),
    )
    let header = 8
    if (size === 1) {
      size = v.getUint32(at + 12) // low half of the 64-bit size
      header = 16
    } else if (size === 0) {
      size = end - at
    }
    if (size < header) return
    yield { type, start: at + header, end: Math.min(at + size, end) }
    at += size
  }
}

interface HeicTransform {
  /** CSS transform that turns the stored pixels upright. */
  css: string
  /** Whether width and height end up swapped. */
  sideways: boolean
}

/** The rotation and mirroring of the primary image, found via pitm and ipma. */
function parseHeicTransform(buf: ArrayBuffer): HeicTransform | undefined {
  const v = new DataView(buf)
  const find = (type: string, start: number, end: number) => {
    for (const box of boxes(v, start, end)) if (box.type === type) return box
  }
  try {
    const meta = find('meta', 0, v.byteLength)
    if (!meta) return
    const inner = meta.start + 4 // meta is a full box
    const pitm = find('pitm', inner, meta.end)
    const iprp = find('iprp', inner, meta.end)
    if (!pitm || !iprp) return
    const primary =
      v.getUint8(pitm.start) === 0
        ? v.getUint16(pitm.start + 4)
        : v.getUint32(pitm.start + 4)
    const ipco = find('ipco', iprp.start, iprp.end)
    const ipma = find('ipma', iprp.start, iprp.end)
    if (!ipco || !ipma) return
    const props = [...boxes(v, ipco.start, ipco.end)]
    const version = v.getUint8(ipma.start)
    const wide = v.getUint8(ipma.start + 3) & 1
    let at = ipma.start + 8
    let css = ''
    let sideways = false
    for (let n = v.getUint32(ipma.start + 4); n > 0; n--) {
      const id = version < 1 ? v.getUint16(at) : v.getUint32(at)
      at += version < 1 ? 2 : 4
      for (let count = v.getUint8(at++); count > 0; count--) {
        const raw = wide ? v.getUint16(at) : v.getUint8(at)
        at += wide ? 2 : 1
        const prop = props[(wide ? raw & 0x7fff : raw & 0x7f) - 1]
        if (id !== primary) continue
        // Transforms apply in the order listed, so later ones go to the left.
        if (prop?.type === 'irot') {
          const turns = v.getUint8(prop.start) & 3
          css = `rotate(${-turns * 90}deg) ${css}`
          if (turns % 2) sideways = !sideways
        } else if (prop?.type === 'imir') {
          // Mode 0 swaps top and bottom, 1 swaps left and right.
          const mode = v.getUint8(prop.start) & 1
          css = `${mode ? 'scaleX' : 'scaleY'}(-1) ${css}`
        }
      }
    }
    return css ? { css: css.trim(), sideways } : undefined
  } catch {
    // header cut off by the range request
  }
}

/**
 * The 'irot' and 'imir' transforms of a HEIC. Drive's rendering above 512px
 * ignores them, so the lightbox has to apply them.
 */
export async function fetchHeicTransform(
  token: string,
  fileId: string,
): Promise<HeicTransform | null> {
  const res = await driveFetch(
    token,
    `/files/${fileId}`,
    { alt: 'media' },
    { headers: { Range: 'bytes=0-65535' } },
  )
  return parseHeicTransform(await res.arrayBuffer()) ?? null
}

export function thumbnailUrl(
  photo: Pick<DrivePhoto, 'thumbnailLink'>,
  size = 400,
): string | undefined {
  return photo.thumbnailLink?.replace(/=s\d+$/, `=s${size}`)
}

/** Browsers can't render HEIC/HEIF, so Drive's rendered thumbnail is used instead. */
export function isHeic(photo: Pick<DrivePhoto, 'mimeType' | 'name'>): boolean {
  return (
    /^image\/hei[cf]/i.test(photo.mimeType) || /\.hei[cf]$/i.test(photo.name)
  )
}

// Drive only allows [a-zA-Z0-9.!@$%^&*()-_/] in property keys, so the tag's
// name lives in the value and the key is a hash of its lowercased name.
const TAG_PREFIX = 'tag.'
const TAG_KEY_LENGTH = TAG_PREFIX.length + 14
// Drive limits an app property's key + value to 124 bytes.
const MAX_TAG_BYTES = 124 - TAG_KEY_LENGTH

// cyrb53: a fast, well-distributed 53-bit string hash.
function hashString(input: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0))
    .toString(16)
    .padStart(14, '0')
}

function tagKey(tag: string): string {
  return TAG_PREFIX + hashString(tag.toLowerCase())
}

export function photoTags(photo: Pick<DrivePhoto, 'appProperties'>): string[] {
  return Object.entries(photo.appProperties ?? {})
    .filter(([key]) => key.startsWith(TAG_PREFIX))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b))
}

/** Tidies a typed tag; returns undefined if it is empty or too long to store. */
export function normalizeTag(input: string): string | undefined {
  const tag = input.trim().replace(/\s+/g, ' ')
  if (!tag || new TextEncoder().encode(tag).length > MAX_TAG_BYTES) return
  return tag
}
/** Adds and removes tags on a photo; resolves with the photo's resulting properties. */
export async function updatePhotoTags(
  token: string,
  photoId: string,
  change: { add?: string[]; remove?: string[] },
): Promise<Record<string, string>> {
  const appProperties: Record<string, string | null> = {}
  for (const tag of change.remove ?? []) appProperties[tagKey(tag)] = null
  for (const tag of change.add ?? []) appProperties[tagKey(tag)] = tag
  const res = await driveFetch(
    token,
    `/files/${photoId}`,
    { fields: 'appProperties' },
    { method: 'PATCH', body: JSON.stringify({ appProperties }) },
  )
  const data = (await res.json()) as {
    appProperties?: Record<string, string>
  }
  return data.appProperties ?? {}
}

/** Renames a photo in Drive; resolves with the saved name. */
export async function renamePhoto(
  token: string,
  photoId: string,
  name: string,
): Promise<string> {
  const res = await driveFetch(
    token,
    `/files/${photoId}`,
    { fields: 'name' },
    { method: 'PATCH', body: JSON.stringify({ name }) },
  )
  return ((await res.json()) as { name: string }).name
}

/** Moves a photo to the Drive trash, where it can still be restored. */
export async function trashPhoto(
  token: string,
  photoId: string,
): Promise<void> {
  await driveFetch(
    token,
    `/files/${photoId}`,
    { fields: 'id', supportsAllDrives: 'true' },
    { method: 'PATCH', body: JSON.stringify({ trashed: true }) },
  )
}

/** Why files can't be added to the folder, or undefined when they can. */
async function addChildrenBlocker(
  token: string,
  folderId: string,
): Promise<string | undefined> {
  const res = await driveFetch(token, `/files/${folderId}`, {
    fields: 'name, mimeType, ownedByMe, capabilities(canAddChildren)',
    supportsAllDrives: 'true',
  })
  const data = (await res.json()) as {
    name: string
    mimeType: string
    ownedByMe?: boolean
    capabilities?: { canAddChildren?: boolean }
  }
  if (data.mimeType !== FOLDER_MIME)
    return `"${data.name}" (${folderId}) is not a folder (${data.mimeType}).`
  if (data.capabilities?.canAddChildren === false)
    return `Drive says you can't add files to "${data.name}" (${folderId}); ${data.ownedByMe ? 'you own it' : 'it is owned by someone else'}.`
}

/**
 * Saves an edited image: as a new file, or (with `replaceId`) as the new
 * content of an existing one. Resolves with the file's id.
 */
export async function uploadImage(
  token: string,
  file: {
    name: string
    blob: Blob
    parentId?: string
    appProperties?: Record<string, string>
    replaceId?: string
  },
): Promise<string> {
  const boundary = `dpd-${crypto.randomUUID()}`
  if (!file.replaceId && file.parentId) {
    const blocker = await addChildrenBlocker(token, file.parentId)
    if (blocker) throw new Error(blocker)
  }
  const metadata = {
    name: file.name,
    mimeType: file.blob.type,
    ...(!file.replaceId && file.parentId && { parents: [file.parentId] }),
    ...(!file.replaceId &&
      file.appProperties &&
      Object.keys(file.appProperties).length > 0 && {
        appProperties: file.appProperties,
      }),
  }
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.blob.type}\r\n\r\n`,
    file.blob,
    `\r\n--${boundary}--`,
  ])
  const res = await driveFetch(
    token,
    file.replaceId ? `/files/${file.replaceId}` : '/files',
    { uploadType: 'multipart', fields: 'id', supportsAllDrives: 'true' },
    {
      method: file.replaceId ? 'PATCH' : 'POST',
      body,
      base: UPLOAD_API,
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    },
  )
  return ((await res.json()) as { id: string }).id
}

/** The tags of a photo as app properties, so a copy keeps them. */
export function tagProperties(
  photo: Pick<DrivePhoto, 'appProperties'>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(photo.appProperties ?? {}).filter(([key]) =>
      key.startsWith(TAG_PREFIX),
    ),
  )
}
