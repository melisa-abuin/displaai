const API = 'https://www.googleapis.com/drive/v3'

export interface DriveFolder {
  id: string
  name: string
  parentId?: string
  path: string
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
}

export interface PhotoPageParam {
  chunk: number
  token?: string
}

export interface PhotoPage {
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
): Promise<Response> {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`${API}${path}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
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

/** Every folder in the Drive, with the number of images directly inside it. */
export async function listFolders(token: string): Promise<DriveFolder[]> {
  const [images, folders] = await Promise.all([
    listAll<{ parents?: string[] }>(token, {
      q: IMAGE_QUERY,
      fields: 'nextPageToken, files(parents)',
    }),
    listAll<{ id: string; name: string; parents?: string[] }>(token, {
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, parents)',
    }),
  ])

  const counts = new Map<string, number>()
  for (const image of images) {
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

  return folders
    .map(({ id, name, parents }) => ({
      id,
      name,
      parentId: parents?.[0],
      path: pathOf({ name, parents }),
      photoCount: counts.get(id) ?? 0,
      totalCount: totals.get(id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Keeps the `q` parameter at a safe length when many folders are connected.
const FOLDERS_PER_QUERY = 40

/** Lists photos of the given folders, walking through them chunk by chunk. */
export async function listPhotos(
  token: string,
  folderIds: string[],
  param: PhotoPageParam = { chunk: 0 },
): Promise<PhotoPage> {
  const chunks: string[][] = []
  for (let i = 0; i < folderIds.length; i += FOLDERS_PER_QUERY) {
    chunks.push(folderIds.slice(i, i + FOLDERS_PER_QUERY))
  }
  const ids = chunks[param.chunk]
  if (!ids) return { files: [] }

  const parents = ids.map((id) => `'${id}' in parents`).join(' or ')
  const res = await driveFetch(token, '/files', {
    q: `${IMAGE_QUERY} and (${parents})`,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink)',
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
  return { files: data.files, nextParam }
}
export async function fetchPhotoBlob(
  token: string,
  fileId: string,
): Promise<Blob> {
  const res = await driveFetch(token, `/files/${fileId}`, { alt: 'media' })
  return res.blob()
}

export function thumbnailUrl(
  photo: DrivePhoto,
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
