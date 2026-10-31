import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import {
  fetchHeicTransform,
  getUserEmail,
  photoTags,
  renamePhoto,
  trashPhoto,
  updatePhotoTags,
  uploadImage,
  type PhotoLocation,
  type PhotoPage,
  type TagCount,
} from './api'
import { useConnectedFolders } from './connectedFolders'
import { buildFolderIndex, descendantIds } from './folderTree'
import {
  applyPhotoName,
  applyPhotoProperties,
  getPhotosOf,
  loadIndex,
  removePhoto,
  syncIndex,
  useIndexVersion,
  useLibrary,
  useLibraryState,
} from './libraryStore'
import { matchesFilters, NO_FILTERS, type TagFilter } from './tagFilter'
const SYNC_STALE_MS = 1000 * 60 * 15 // 15 minutes

/** Folders of the Drive; keeps the local index in sync while mounted. */
export function useFolders(token: string) {
  const library = useLibrary()
  const { ready, error } = useLibraryState()

  useEffect(() => {
    void loadIndex().then(() => syncIndex(token, SYNC_STALE_MS))
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        void syncIndex(token, SYNC_STALE_MS)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [token])

  return {
    data: library?.folders,
    isLoading: !ready && !error,
    error: ready ? null : error,
  }
}

/** Every distinct tag among the photos of the enabled folders. */
export function useTags() {
  const version = useIndexVersion()
  const library = useLibrary()
  const { entries } = useConnectedFolders()
  const data = useMemo<TagCount[] | undefined>(() => {
    if (!library) return undefined
    const index = buildFolderIndex(library.folders)
    const ids = new Set<string>()
    for (const { id, recursive } of entries) {
      if (!index.byId.has(id)) continue
      for (const d of recursive ? descendantIds(index, id) : [id]) ids.add(d)
    }
    const counts = new Map<string, number>()
    for (const photo of getPhotosOf([...ids], false)[0].files)
      for (const tag of photoTags(photo))
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
    // `version` invalidates the memo when the index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, version, entries])
  return { data }
}

export function useUpdateTags(token: string) {
  return useMutation({
    mutationFn: async ({
      photoId,
      add,
      remove,
    }: {
      photoId: string
      add: string[]
      remove: string[]
    }) => {
      const appProperties = await updatePhotoTags(token, photoId, {
        add,
        remove,
      })
      await applyPhotoProperties(photoId, appProperties)
      return appProperties
    },
  })
}

export function useRenamePhoto(token: string) {
  return useMutation({
    mutationFn: async ({
      photoId,
      name,
    }: {
      photoId: string
      name: string
    }) => {
      const saved = await renamePhoto(token, photoId, name)
      await applyPhotoName(photoId, saved)
      return saved
    },
  })
}

/** Moves a photo to the Drive trash and removes it from the index. */
export function useTrashPhoto(token: string) {
  return useMutation({
    mutationFn: async (photoId: string) => {
      await trashPhoto(token, photoId)
      await removePhoto(photoId)
    },
  })
}

/** Saves an edited image (new file or replacing one) and refreshes the index. */
export function useSaveEditedPhoto(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: Parameters<typeof uploadImage>[1]) => {
      const id = await uploadImage(token, file)
      if (file.replaceId) {
        for (const key of [
          ['drive', 'photo-blob', id],
          ['drive', 'heic-transform', 'v2', id],
          ['vision', 'faces', id],
          ['vision', 'scene', id],
        ])
          queryClient.removeQueries({ queryKey: key })
      }
      await syncIndex(token)
      return id
    },
  })
}

export interface TagChange {
  photoId: string
  add: string[]
  remove: string[]
}

const BULK_TAG_CONCURRENCY = 4

/** Applies tag changes to several photos; every change is attempted even if some fail. */
export function useUpdateTagsBulk(token: string) {
  return useMutation({
    mutationFn: async (changes: TagChange[]) => {
      let next = 0
      let failed = 0
      const worker = async () => {
        while (next < changes.length) {
          const { photoId, add, remove } = changes[next++]
          try {
            const appProperties = await updatePhotoTags(token, photoId, {
              add,
              remove,
            })
            await applyPhotoProperties(photoId, appProperties)
          } catch {
            failed++
          }
        }
      }
      await Promise.all(
        Array.from(
          { length: Math.min(BULK_TAG_CONCURRENCY, changes.length) },
          worker,
        ),
      )
      if (failed > 0)
        throw new Error(`${failed} of ${changes.length} photos failed`)
    },
  })
}

/**
 * Mixed by default (sorted by date); when `grouped`, one page per folder in
 * the order of `folderIds`.
 */
export function usePhotos(
  folderIds: readonly string[],
  grouped: boolean,
  filters: readonly TagFilter[] = NO_FILTERS,
) {
  const version = useIndexVersion()
  const { ready, error } = useLibraryState()
  const pages = useMemo<PhotoPage[]>(
    () =>
      ready
        ? getPhotosOf(folderIds, grouped).map((page) => ({
            ...page,
            files: page.files.filter((photo) => matchesFilters(photo, filters)),
          }))
        : [],
    // `version` invalidates the memo when the index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, version, folderIds, grouped, filters],
  )
  return { data: { pages }, isLoading: !ready && !error, error }
}

/** How many photos each set of folders holds once its filters are applied, in the same order. */
export function usePhotoCounts(
  sets: readonly {
    folderIds: readonly string[]
    filters: readonly TagFilter[]
  }[],
) {
  const version = useIndexVersion()
  const { ready } = useLibraryState()
  return useMemo<number[] | undefined>(
    () =>
      ready
        ? sets.map(
            ({ folderIds, filters }) =>
              getPhotosOf(folderIds, false)[0].files.filter((photo) =>
                matchesFilters(photo, filters),
              ).length,
          )
        : undefined,
    // `version` invalidates the memo when the index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, version, sets],
  )
}

export function useHeicTransform(
  token: string,
  photoId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['drive', 'heic-transform', 'v2', photoId],
    queryFn: () => fetchHeicTransform(token, photoId),
    enabled,
  })
}

/** Every photo with GPS data in the given folders. */
export function usePhotoLocations(
  folderIds: readonly string[],
  filters: readonly TagFilter[] = NO_FILTERS,
) {
  const version = useIndexVersion()
  const { ready, error } = useLibraryState()
  const data = useMemo<PhotoLocation[]>(() => {
    if (!ready) return []
    return getPhotosOf(folderIds, false).flatMap(({ files }) =>
      files.flatMap((photo) => {
        if (!matchesFilters(photo, filters)) return []
        const location = photo.imageMediaMetadata?.location
        if (!location) return []
        return [
          {
            id: photo.id,
            name: photo.name,
            latitude: location.latitude,
            longitude: location.longitude,
            thumbnailLink: photo.thumbnailLink,
            thumbnailAt: photo.thumbnailAt,
            parentId: photo.parents[0],
            date: photo.imageMediaMetadata?.time ?? photo.createdTime,
          },
        ]
      }),
    )
    // `version` invalidates the memo when the index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, folderIds, filters])
  return { data, isLoading: !ready && !error, error }
}

export function useUserEmail(token: string) {
  return useQuery({
    queryKey: ['drive', 'about', 'email'],
    queryFn: async () => (await getUserEmail(token)) ?? null,
  })
}
