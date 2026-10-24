import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { fetchPhotoBlob } from '../drive/api'
import { analyzeScene, detectFaces } from './vision'

const COMMON = {
  staleTime: Infinity,
  gcTime: 1000 * 60 * 5,
  retry: false,
  meta: { persist: false },
} as const

// Drive's thumbnails can't be read by script (no CORS), so the photo itself is
// downloaded through the API. It shares the lightbox's query key, so an open
// photo isn't downloaded twice.
function photoSource(queryClient: QueryClient, token: string, photoId: string) {
  return () =>
    queryClient.fetchQuery({
      queryKey: ['drive', 'photo-blob', photoId],
      queryFn: () => fetchPhotoBlob(token, photoId),
      staleTime: 1000 * 30,
      gcTime: 0,
      meta: { persist: false },
    })
}

export function useFaces(token: string, photoId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['vision', 'faces', photoId],
    queryFn: ({ signal }) =>
      detectFaces(photoSource(queryClient, token, photoId), signal),
    enabled,
    ...COMMON,
  })
}

/** Objects and overall labels for a photo. */
export function useScene(token: string, photoId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['vision', 'scene', photoId],
    queryFn: ({ signal }) =>
      analyzeScene(photoSource(queryClient, token, photoId), signal),
    enabled,
    ...COMMON,
  })
}
