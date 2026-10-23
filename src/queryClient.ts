import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

/** Clears cached data, service workers and caches, then reloads the page. */
export async function reloadApp() {
  queryClient.clear()
  await persister.removeClient()

  if (navigator.onLine) {
    await Promise.all(
      ((await navigator.serviceWorker?.getRegistrations()) || []).map((r) =>
        r.unregister(),
      ),
    )
    await Promise.all(
      ((await window.caches?.keys()) || []).map((c) => window.caches.delete(c)),
    )
  }

  window.location.reload()
}
