import { useEffect, useSyncExternalStore } from 'react'
import {
  DriveHttpError,
  fetchThumbnailLinks,
  getStartPageToken,
  listAllFolders,
  listAllPhotos,
  listChanges,
  photoTags,
} from './api'
import type {
  DriveFolder,
  Library,
  IndexedPhoto,
  IndexedFolder,
  MediaKind,
} from '../interfaces'
import { mediaKindOf } from '../lib/mediaKind'
import { useMediaKinds } from '../features/settings/hooks/useMediaKinds'
import { getMediaKinds } from '../features/settings/utils/mediaKinds'
import { readAll, writeBatch } from './store'
import {
  LIBRARY_SCOPE,
  SCOPE_KEY,
  START_PAGE_TOKEN_KEY,
  THUMBNAIL_BATCH_SIZE,
  THUMBNAIL_CONCURRENCY,
  THUMBNAIL_RETRY_MS,
  THUMBNAIL_TTL_MS,
} from './constants'

interface State {
  /** The index was read from IndexedDB (or the first full sync finished). */
  ready: boolean
  syncing: boolean
  error: Error | null
  /** Bumped on every change of the data. */
  version: number
}

interface Derived {
  version: number
  kinds: ReadonlySet<MediaKind>
  library: Library
  byFolder: Map<string, IndexedPhoto[]>
}

const photos = new Map<string, IndexedPhoto>()
const folders = new Map<string, IndexedFolder>()
let startPageToken: string | undefined
let state: State = { ready: false, syncing: false, error: null, version: 0 }
let derived: Derived | undefined
let loading: Promise<void> | undefined
let syncing: Promise<void> | undefined
let lastSyncedAt = 0
const listeners = new Set<() => void>()

// Refreshed links are kept apart so they don't re-derive the whole index.
const thumbs = new Map<string, { link?: string; at: number }>()
const refreshing = new Set<string>()
let activeToken: string | undefined
let thumbVersion = 0
const thumbListeners = new Set<() => void>()

function setState(patch: Partial<State>, dataChanged = false) {
  state = {
    ...state,
    ...patch,
    version: dataChanged ? state.version + 1 : state.version,
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const byCreatedDesc = (a: IndexedPhoto, b: IndexedPhoto) =>
  (b.createdTime ?? '').localeCompare(a.createdTime ?? '')

function computeLibrary(visible: readonly IndexedPhoto[]): Library {
  const counts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  for (const photo of visible) {
    for (const tag of photoTags(photo))
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    for (const parent of photo.parents)
      counts.set(parent, (counts.get(parent) ?? 0) + 1)
  }

  const pathOf = (folder: IndexedFolder) => {
    const names = [folder.name]
    const seen = new Set<string>()
    let parent = folders.get(folder.parents?.[0] ?? '')
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id)
      names.unshift(parent.name)
      parent = folders.get(parent.parents?.[0] ?? '')
    }
    return names.join(' / ')
  }

  const totals = new Map<string, number>()
  for (const [folderId, count] of counts) {
    const seen = new Set<string>()
    let folder = folders.get(folderId)
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id)
      totals.set(folder.id, (totals.get(folder.id) ?? 0) + count)
      folder = folders.get(folder.parents?.[0] ?? '')
    }
  }

  return {
    folders: [...folders.values()]
      .map((folder): DriveFolder => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parents?.[0],
        path: pathOf(folder),
        ownedByMe: folder.ownedByMe,
        photoCount: counts.get(folder.id) ?? 0,
        totalCount: totals.get(folder.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: [...tagCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function getDerived(): Derived {
  const kinds = getMediaKinds()
  if (derived?.version === state.version && derived.kinds === kinds)
    return derived
  const visible = [...photos.values()].filter((photo) =>
    kinds.has(mediaKindOf(photo)),
  )
  const byFolder = new Map<string, IndexedPhoto[]>()
  for (const photo of visible) {
    for (const parent of photo.parents) {
      const list = byFolder.get(parent)
      if (list) list.push(photo)
      else byFolder.set(parent, [photo])
    }
  }
  for (const list of byFolder.values()) list.sort(byCreatedDesc)
  derived = {
    version: state.version,
    kinds,
    library: computeLibrary(visible),
    byFolder,
  }
  return derived
}

/** Reads the persisted index into memory; safe to call repeatedly. */
export function loadIndex(): Promise<void> {
  loading ??= (async () => {
    try {
      const snapshot = await readAll()
      // A sync that finished first is newer than what was stored.
      if (
        snapshot.meta[SCOPE_KEY] === LIBRARY_SCOPE &&
        photos.size === 0 &&
        folders.size === 0 &&
        !startPageToken
      ) {
        for (const photo of snapshot.photos) photos.set(photo.id, photo)
        for (const folder of snapshot.folders) folders.set(folder.id, folder)
        startPageToken = snapshot.meta[START_PAGE_TOKEN_KEY]
      }
      setState({ ready: startPageToken !== undefined }, true)
    } catch (error) {
      setState({ error: error as Error })
    }
  })()
  return loading
}

async function fullSync(token: string) {
  // The token comes first so anything changed during the listing is replayed afterwards.
  const nextToken = await getStartPageToken(token)
  const [allPhotos, allFolders] = await Promise.all([
    listAllPhotos(token),
    listAllFolders(token),
  ])
  await writeBatch({
    clear: true,
    putPhotos: allPhotos,
    putFolders: allFolders,
    meta: { [START_PAGE_TOKEN_KEY]: nextToken, [SCOPE_KEY]: LIBRARY_SCOPE },
  })
  photos.clear()
  folders.clear()
  for (const photo of allPhotos) photos.set(photo.id, photo)
  for (const folder of allFolders) folders.set(folder.id, folder)
  startPageToken = nextToken
  setState({ ready: true }, true)
}

async function incrementalSync(token: string, from: string) {
  const changes = await listChanges(token, from)
  const deletePhotos = changes.removedIds.filter((id) => photos.has(id))
  const deleteFolders = changes.removedIds.filter((id) => folders.has(id))
  await writeBatch({
    deletePhotos,
    deleteFolders,
    putPhotos: changes.photos,
    putFolders: changes.folders,
    meta: { [START_PAGE_TOKEN_KEY]: changes.newStartPageToken },
  })
  for (const id of changes.removedIds) {
    photos.delete(id)
    folders.delete(id)
  }
  for (const photo of changes.photos) photos.set(photo.id, photo)
  for (const folder of changes.folders) folders.set(folder.id, folder)
  startPageToken = changes.newStartPageToken
  const changed =
    changes.removedIds.length > 0 ||
    changes.photos.length > 0 ||
    changes.folders.length > 0
  setState({}, changed)
}

/** Brings the index up to date: a full listing the first time, only the changes afterwards. */
export function syncIndex(token: string, staleMs = 0): Promise<void> {
  setActiveToken(token)
  if (syncing) return syncing
  if (Date.now() - lastSyncedAt < staleMs) return Promise.resolve()
  setState({ syncing: true, error: null })
  syncing = (async () => {
    try {
      await loadIndex()
      if (startPageToken) {
        try {
          await incrementalSync(token, startPageToken)
        } catch (error) {
          // The saved token is no longer valid, so the history is lost.
          const invalid =
            error instanceof DriveHttpError &&
            [400, 404, 410].includes(error.status)
          if (!invalid) throw error
          await fullSync(token)
        }
      } else {
        await fullSync(token)
      }
      lastSyncedAt = Date.now()
      setState({ syncing: false })
    } catch (error) {
      setState({ syncing: false, error: error as Error })
    } finally {
      syncing = undefined
    }
  })()
  return syncing
}

/** Forgets everything, in memory and on disk (sign out). */
export async function clearIndex(): Promise<void> {
  photos.clear()
  folders.clear()
  startPageToken = undefined
  lastSyncedAt = 0
  setActiveToken(undefined)
  thumbs.clear()
  setState({ ready: false, error: null }, true)
  await writeBatch({ clear: true })
}

/** Applies the properties Drive returned after a tag edit. */
export async function applyPhotoProperties(
  photoId: string,
  appProperties: Record<string, string>,
): Promise<void> {
  const photo = photos.get(photoId)
  if (!photo) return
  const updated = { ...photo, appProperties }
  photos.set(photoId, updated)
  setState({}, true)
  await writeBatch({ putPhotos: [updated] })
}

/** Applies the name Drive returned after a rename. */
export async function applyPhotoName(
  photoId: string,
  name: string,
): Promise<void> {
  const photo = photos.get(photoId)
  if (!photo) return
  const updated = { ...photo, name }
  photos.set(photoId, updated)
  setState({}, true)
  await writeBatch({ putPhotos: [updated] })
}

/** Drops a photo from the index after it was moved to the trash. */
export async function removePhoto(photoId: string): Promise<void> {
  if (!photos.delete(photoId)) return
  setState({}, true)
  await writeBatch({ deletePhotos: [photoId] })
}

interface Thumbnailed {
  id: string
  thumbnailLink?: string
  thumbnailAt?: number
}

function subscribeThumbs(listener: () => void) {
  thumbListeners.add(listener)
  return () => {
    thumbListeners.delete(listener)
  }
}

function setActiveToken(token: string | undefined) {
  if (activeToken === token) return
  activeToken = token
  for (const listener of thumbListeners) listener()
}

function currentThumb(photo: Thumbnailed) {
  const at = photo.thumbnailAt ?? 0
  const refreshed = thumbs.get(photo.id)
  return refreshed && refreshed.at > at
    ? refreshed
    : { link: photo.thumbnailLink, at }
}

let queued: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Collects the ids asked for by every row in the same moment, so a long
 * gallery costs a few batch requests instead of one per row (which Drive
 * rate-limits, leaving tiles with expired links).
 */
function refreshThumbnails(ids: string[]) {
  if (!activeToken) return
  for (const id of ids) {
    if (refreshing.has(id)) continue
    refreshing.add(id)
    queued.push(id)
  }
  flushTimer ??= setTimeout(() => {
    flushTimer = undefined
    const todo = queued
    queued = []
    void fetchThumbnails(todo)
  })
}

async function fetchThumbnails(todo: string[]) {
  const token = activeToken
  if (!token) {
    for (const id of todo) refreshing.delete(id)
    return
  }
  const batches: string[][] = []
  for (let i = 0; i < todo.length; i += THUMBNAIL_BATCH_SIZE)
    batches.push(todo.slice(i, i + THUMBNAIL_BATCH_SIZE))
  const updated: IndexedPhoto[] = []
  let next = 0
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++]
      let links = new Map<string, string | undefined>()
      try {
        links = await fetchThumbnailLinks(token, batch)
      } catch {
        // Every photo of the batch counts as failed.
      }
      const at = Date.now()
      let failed = false
      for (const id of batch) {
        refreshing.delete(id)
        if (!links.has(id)) {
          // Not persisted. The old link stays, as it may still be served from
          // the browser cache, and the photo counts as stale again shortly.
          failed = true
          const photo = photos.get(id)
          thumbs.set(id, {
            link: photo ? currentThumb(photo).link : thumbs.get(id)?.link,
            at: at - THUMBNAIL_TTL_MS + THUMBNAIL_RETRY_MS,
          })
          continue
        }
        const link = links.get(id)
        thumbs.set(id, { link, at })
        const photo = photos.get(id)
        if (photo) {
          const refreshed = { ...photo, thumbnailLink: link, thumbnailAt: at }
          photos.set(id, refreshed)
          updated.push(refreshed)
        }
      }
      thumbVersion++
      for (const listener of thumbListeners) listener()
      if (failed)
        setTimeout(() => {
          thumbVersion++
          for (const listener of thumbListeners) listener()
        }, THUMBNAIL_RETRY_MS)
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(THUMBNAIL_CONCURRENCY, batches.length) },
      worker,
    ),
  )
  if (updated.length) await writeBatch({ putPhotos: updated }).catch(() => {})
}
/**
 * The photos with their freshest thumbnail links. Expired links are fetched
 * again, so only the photos on screen cost a request. They stay in place
 * meanwhile: the browser cache is keyed by URL, so the old link usually
 * still renders instantly instead of flashing the file name.
 */
export function useFreshThumbnails<T extends Thumbnailed>(
  photos: readonly T[],
): T[] {
  useSyncExternalStore(subscribeThumbs, () => thumbVersion)
  // The index can render before the first sync provides a token; once it is
  // known the refresh must run again, or the expired links would stay unfetched.
  const token = useSyncExternalStore(subscribeThumbs, () => activeToken)
  const now = Date.now()
  const stale: string[] = []
  const result = photos.map((photo) => {
    const { link, at } = currentThumb(photo)
    if (now - at >= THUMBNAIL_TTL_MS) {
      stale.push(photo.id)
    }
    return link === photo.thumbnailLink
      ? photo
      : { ...photo, thumbnailLink: link }
  })
  const key = stale.join(',')
  useEffect(() => {
    if (key && token) refreshThumbnails(key.split(','))
  }, [key, token])
  return result
}

function useIndexState() {
  return useSyncExternalStore(subscribe, () => state)
}

export function useLibraryState() {
  const { ready, syncing, error } = useIndexState()
  return { ready, syncing, error }
}

export function useLibrary(): Library | undefined {
  const { ready, version } = useIndexState()
  // Counts and tags only cover the shown media types.
  useMediaKinds()
  void version
  return ready ? getDerived().library : undefined
}

/** Photos of the given folders, newest first; `grouped` keeps them folder by folder. */
export function getPhotosOf(
  folderIds: readonly string[],
  grouped: boolean,
): { folderId?: string; files: IndexedPhoto[] }[] {
  const { byFolder } = getDerived()
  if (grouped)
    return folderIds.map((folderId) => ({
      folderId,
      files: byFolder.get(folderId) ?? [],
    }))
  const seen = new Set<string>()
  const files = folderIds
    .flatMap((id) => byFolder.get(id) ?? [])
    .filter((photo) => !seen.has(photo.id) && seen.add(photo.id))
    .sort(byCreatedDesc)
  return [{ files }]
}

/** Changes whenever the index or the shown media types change. */
export function useIndexVersion(): string {
  const [kinds] = useMediaKinds()
  return `${useIndexState().version}:${[...kinds].join()}`
}
