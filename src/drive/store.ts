import type { IndexedPhoto, IndexedFolder } from '../interfaces'
import {
  DB_NAME,
  DB_VERSION,
  FOLDERS_STORE,
  META_STORE,
  PHOTOS_STORE,
} from './constants'

export interface Snapshot {
  photos: IndexedPhoto[]
  folders: IndexedFolder[]
  meta: Record<string, string>
}

export interface Batch {
  /** Empties every store before applying the rest of the batch. */
  clear?: boolean
  putPhotos?: IndexedPhoto[]
  deletePhotos?: string[]
  putFolders?: IndexedFolder[]
  deleteFolders?: string[]
  meta?: Record<string, string>
}

let dbPromise: Promise<IDBDatabase> | undefined

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' })
      db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' })
      db.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// The index is only a cache of Drive, so a database we can't open is deleted and rebuilt.
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= open()
    .catch(async () => {
      await deleteDb()
      return open()
    })
    .catch((error: unknown) => {
      dbPromise = undefined
      throw error
    })
  return dbPromise
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readAll(): Promise<Snapshot> {
  const db = await openDb()
  const tx = db.transaction(
    [PHOTOS_STORE, FOLDERS_STORE, META_STORE],
    'readonly',
  )
  const metaStore = tx.objectStore(META_STORE)
  const [photos, folders, keys, values] = await Promise.all([
    result(tx.objectStore(PHOTOS_STORE).getAll() as IDBRequest<IndexedPhoto[]>),
    result(
      tx.objectStore(FOLDERS_STORE).getAll() as IDBRequest<IndexedFolder[]>,
    ),
    result(metaStore.getAllKeys() as IDBRequest<string[]>),
    result(metaStore.getAll() as IDBRequest<string[]>),
  ])
  return {
    photos,
    folders,
    meta: Object.fromEntries(keys.map((key, i) => [key, values[i]])),
  }
}

/** Applies the whole batch in one transaction, so the store is never half-updated. */
export async function writeBatch(batch: Batch): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(
    [PHOTOS_STORE, FOLDERS_STORE, META_STORE],
    'readwrite',
  )
  const photos = tx.objectStore(PHOTOS_STORE)
  const folders = tx.objectStore(FOLDERS_STORE)
  const meta = tx.objectStore(META_STORE)
  if (batch.clear) {
    photos.clear()
    folders.clear()
    meta.clear()
  }
  for (const id of batch.deletePhotos ?? []) photos.delete(id)
  for (const id of batch.deleteFolders ?? []) folders.delete(id)
  for (const photo of batch.putPhotos ?? []) photos.put(photo)
  for (const folder of batch.putFolders ?? []) folders.put(folder)
  for (const [key, value] of Object.entries(batch.meta ?? {}))
    meta.put(value, key)
  await done(tx)
}
