import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    type InfiniteData,
} from '@tanstack/react-query'
import {
    getUserEmail,
    listLibrary,
    listPhotoLocations,
    listPhotos,
    updatePhotoTags,
    type Library,
    type PhotoPage,
    type PhotoPageParam,
} from './api'

const LIBRARY_KEY = ['drive', 'library']

function useLibrary<T>(token: string, select: (library: Library) => T) {
  return useQuery({
    queryKey: LIBRARY_KEY,
    queryFn: () => listLibrary(token),
    select,
  })
}

const selectFolders = (library: Library) => library.folders
const selectTags = (library: Library) => library.tags

export function useFolders(token: string) {
  return useLibrary(token, selectFolders)
}

/** Every distinct tag in the Drive, gathered during the library sync. */
export function useTags(token: string) {
  return useLibrary(token, selectTags)
}

export function useUpdateTags(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      photoId,
      add,
      remove,
    }: {
      photoId: string
      add: string[]
      remove: string[]
    }) => updatePhotoTags(token, photoId, { add, remove }),
    onSuccess: (appProperties, { photoId, add, remove }) => {
      queryClient.setQueriesData<InfiniteData<PhotoPage, unknown>>(
        { queryKey: ['drive', 'photos'] },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              files: page.files.map((file) =>
                file.id === photoId ? { ...file, appProperties } : file,
              ),
            })),
          },
      )
      queryClient.setQueryData<Library>(LIBRARY_KEY, (library) => {
        if (!library) return library
        const counts = new Map(library.tags.map((t) => [t.name, t.count]))
        const bump = (name: string, by: number) =>
          counts.set(name, (counts.get(name) ?? 0) + by)
        // Callers pass only tags that really change on the photo.
        for (const name of add) bump(name, 1)
        for (const name of remove) bump(name, -1)
        return {
          ...library,
          tags: [...counts]
            .filter(([, count]) => count > 0)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }
      })
    },
  })
}

/**
 * Mixed by default (sorted by date); when `grouped`, photos are listed folder by
 * folder in the order of `folderIds`.
 */
export function usePhotos(
  token: string,
  folderIds: readonly string[],
  grouped: boolean,
) {
  // Mixed listing doesn't depend on the order of the folders.
  const ids = grouped ? folderIds : [...folderIds].sort()
  return useInfiniteQuery({
    queryKey: ['drive', 'photos', grouped, ids],
    queryFn: ({ pageParam }) => listPhotos(token, [...ids], pageParam, grouped),
    initialPageParam: undefined as PhotoPageParam | undefined,
    getNextPageParam: (last) => last.nextParam,
  })
}

export function usePhotoLocations(token: string, folderIds: readonly string[]) {
  const sortedIds = [...folderIds].sort()
  return useQuery({
    queryKey: ['drive', 'locations', 'v2', sortedIds],
    queryFn: () => listPhotoLocations(token, sortedIds),
  })
}

export function useUserEmail(token: string) {
  return useQuery({
    queryKey: ['drive', 'about', 'email'],
    queryFn: async () => (await getUserEmail(token)) ?? null,
  })
}
