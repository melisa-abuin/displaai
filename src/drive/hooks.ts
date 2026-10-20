import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
    getUserEmail,
    listFolders,
    listPhotoLocations,
    listPhotos,
    type PhotoPageParam,
} from './api'

export function useFolders(token: string) {
  return useQuery({
    queryKey: ['drive', 'folders'],
    queryFn: () => listFolders(token),
  })
}

export function usePhotos(token: string, folderIds: readonly string[]) {
  const sortedIds = [...folderIds].sort()
  return useInfiniteQuery({
    queryKey: ['drive', 'photos', sortedIds],
    queryFn: ({ pageParam }) => listPhotos(token, sortedIds, pageParam),
    initialPageParam: undefined as PhotoPageParam | undefined,
    getNextPageParam: (last) => last.nextParam,
  })
}

export function usePhotoLocations(token: string, folderIds: readonly string[]) {
  const sortedIds = [...folderIds].sort()
  return useQuery({
    queryKey: ['drive', 'locations', sortedIds],
    queryFn: () => listPhotoLocations(token, sortedIds),
  })
}

export function useUserEmail(token: string) {
  return useQuery({
    queryKey: ['drive', 'about', 'email'],
    queryFn: async () => (await getUserEmail(token)) ?? null,
  })
}
