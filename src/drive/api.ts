const API = 'https://www.googleapis.com/drive/v3'

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
  thumbnailLink?: string
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

export interface PhotoPageParam {
  chunk: number
  token?: string
}

export interface PhotoPage {
  /** The folder all the photos of this page are in. */
  folderId?: string
  files: DrivePhoto[]
  nextParam?: PhotoPageParam
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Google Drive session expired')
  }
}

async function driveFetch(
  token: string,
  path: string,
  params?: Record<string, string>,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<Response> {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`${API}${path}${query}`, {
    method: init?.method,
    body: init?.body,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) throw new Error(`Drive API error ${res.status}`)
  return res
}

export async function getUserEmail(token: string): Promise<string | undefined> {
  const res = await driveFetch(token, '/about', {
    fields: 'user(emailAddress)',
  })
  const data = (await res.json()) as { user?: { emailAddress?: string } }
  return data.user?.emailAddress
}

const IMAGE_QUERY = "mimeType contains 'image/' and trashed = false"

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

/**
 * Every folder in the Drive (with the number of images directly inside it) and
 * every tag in use. Tags come from the same pass over all images, so the
 * suggestion list costs no extra requests.
 */
export async function listLibrary(token: string): Promise<Library> {
  const [images, folders] = await Promise.all([
    listAll<Pick<DrivePhoto, 'appProperties'> & { parents?: string[] }>(token, {
      q: IMAGE_QUERY,
      fields: 'nextPageToken, files(parents, appProperties)',
    }),
    listAll<{
      id: string
      name: string
      parents?: string[]
      ownedByMe?: boolean
    }>(token, {
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, parents, ownedByMe)',
    }),
  ])

  const counts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  for (const image of images) {
    for (const tag of photoTags(image)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
    for (const parent of image.parents ?? []) {
      counts.set(parent, (counts.get(parent) ?? 0) + 1)
    }
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const pathOf = (folder: { name: string; parents?: string[] }) => {
    const names = [folder.name]
    const seen = new Set<string>()
    let parent = byId.get(folder.parents?.[0] ?? '')
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id)
      names.unshift(parent.name)
      parent = byId.get(parent.parents?.[0] ?? '')
    }
    return names.join(' / ')
  }

  const totals = new Map<string, number>()
  for (const [folderId, count] of counts) {
    const seen = new Set<string>()
    let folder = byId.get(folderId)
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id)
      totals.set(folder.id, (totals.get(folder.id) ?? 0) + count)
      folder = byId.get(folder.parents?.[0] ?? '')
    }
  }

  return {
    folders: folders
      .map(({ id, name, parents, ownedByMe }) => ({
        id,
        name,
        parentId: parents?.[0],
        path: pathOf({ name, parents }),
        ownedByMe: ownedByMe !== false,
        photoCount: counts.get(id) ?? 0,
        totalCount: totals.get(id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: [...tagCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

// Keeps the `q` parameter at a safe length when many folders are connected.
const FOLDERS_PER_QUERY = 40

/**
 * Lists photos of the given folders. Mixed (the default) walks through the
 * folders in batches, newest first within each batch; grouped lists one folder
 * at a time, in the order given, so the photos of a folder come together.
 */
export async function listPhotos(
  token: string,
  folderIds: string[],
  param: PhotoPageParam = { chunk: 0 },
  grouped = false,
): Promise<PhotoPage> {
  const size = grouped ? 1 : FOLDERS_PER_QUERY
  const chunks: string[][] = []
  for (let i = 0; i < folderIds.length; i += size) {
    chunks.push(folderIds.slice(i, i + size))
  }
  const ids = chunks[param.chunk]
  if (!ids) return { files: [] }

  const parents = ids.map((id) => `'${id}' in parents`).join(' or ')
  const res = await driveFetch(token, '/files', {
    q: `${IMAGE_QUERY} and (${parents})`,
    fields:
      'nextPageToken, files(id, name, mimeType, thumbnailLink, createdTime, size, appProperties, imageMediaMetadata(location, time, width, height))',
    orderBy: 'createdTime desc',
    pageSize: '60',
    ...(param.token && { pageToken: param.token }),
  })
  const data = (await res.json()) as {
    files: DrivePhoto[]
    nextPageToken?: string
  }
  const nextParam: PhotoPageParam | undefined = data.nextPageToken
    ? { chunk: param.chunk, token: data.nextPageToken }
    : param.chunk + 1 < chunks.length
      ? { chunk: param.chunk + 1 }
      : undefined
  return {
    folderId: grouped ? ids[0] : undefined,
    files: data.files,
    nextParam,
  }
}

export interface PhotoLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  thumbnailLink?: string
  /** The folder (album) the photo is in. */
  parentId?: string
  /** EXIF capture time, falling back to when the file was added. */
  date?: string
}

/** Every photo with GPS data in the given folders. */
export async function listPhotoLocations(
  token: string,
  folderIds: string[],
): Promise<PhotoLocation[]> {
  const chunks: string[][] = []
  for (let i = 0; i < folderIds.length; i += FOLDERS_PER_QUERY) {
    chunks.push(folderIds.slice(i, i + FOLDERS_PER_QUERY))
  }
  const results = await Promise.all(
    chunks.map((ids) =>
      listAll<
        Pick<
          DrivePhoto,
          'id' | 'name' | 'thumbnailLink' | 'createdTime' | 'imageMediaMetadata'
        > & { parents?: string[] }
      >(token, {
        q: `${IMAGE_QUERY} and (${ids.map((id) => `'${id}' in parents`).join(' or ')})`,
        fields:
          'nextPageToken, files(id, name, parents, thumbnailLink, createdTime, imageMediaMetadata(location, time))',
      }),
    ),
  )
  const seen = new Set<string>()
  return results.flat().flatMap((file) => {
    const { id, name, imageMediaMetadata } = file
    const location = imageMediaMetadata?.location
    if (!location || seen.has(id)) return []
    seen.add(id)
    return [
      {
        id,
        name,
        latitude: location.latitude,
        longitude: location.longitude,
        thumbnailLink: file.thumbnailLink,
        parentId: file.parents?.[0],
        date: imageMediaMetadata?.time ?? file.createdTime,
      },
    ]
  })
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
