import { useEffect, useMemo } from 'react'
import styles from './App.module.css'
import { useAuth } from './auth/context'
import { FolderManager } from './components/FolderManager'
import { Gallery } from './components/Gallery'
import { Settings } from './components/Settings'
import { Sidebar } from './components/Sidebar'
import { useConnectedFolders } from './drive/connectedFolders'
import {
  buildFolderIndex,
  descendantIds,
  folderChain,
} from './drive/folderTree'
import { useFolders, useUserEmail } from './drive/hooks'
import { parseRoute, paths, useNavigate, usePathname } from './router'

function SignIn() {
  const { signIn, error, isConfigured } = useAuth()
  return (
    <main className={styles.signIn}>
      <h1>Drive Photos</h1>
      <p>Sign in with Google to browse the photos in your Drive.</p>
      <button type="button" onClick={() => void signIn()}>
        Sign in with Google
      </button>
      {!isConfigured && (
        <p role="alert">
          Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code>.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}

function Viewer({ token }: { token: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const route = parseRoute(usePathname())
  const folders = useFolders(token)
  const email = useUserEmail(token)
  const connected = useConnectedFolders()

  const index = useMemo(
    () => (folders.data ? buildFolderIndex(folders.data) : undefined),
    [folders.data],
  )

  // Connected folders that still exist, with the ids of the photos' folders they cover.
  const albums = useMemo(() => {
    if (!index) return undefined
    return connected.entries.flatMap(({ id, recursive }) => {
      const folder = index.byId.get(id)
      if (!folder) return []
      return [
        {
          folder: {
            ...folder,
            photoCount: recursive ? folder.totalCount : folder.photoCount,
          },
          ids: recursive ? descendantIds(index, id) : [id],
        },
      ]
    })
  }, [index, connected.entries])

  const hasConnected = albums ? albums.length > 0 : connected.entries.length > 0
  const folderId = route.name === 'album' ? route.folderId : null
  const activeAlbum =
    folderId === null
      ? undefined
      : albums?.find((album) => album.folder.id === folderId)
  const isGalleryRoute = route.name === 'gallery' || route.name === 'album'
  const foldersPath = route.name === 'folders' ? route.path : undefined
  const foldersUrl = foldersPath ? paths.foldersAt(foldersPath) : undefined
  const managerFolderId = foldersPath?.at(-1) ?? null
  // The URL for the folder manager's current folder, once folders have loaded.
  const canonicalFoldersUrl = useMemo(() => {
    if (!index || managerFolderId === null) return undefined
    const chain = folderChain(index, managerFolderId)
    return paths.foldersAt(chain.map((folder) => folder.id))
  }, [index, managerFolderId])

  // Nothing is set up yet, so send the user to pick folders; unknown URLs go home.
  useEffect(() => {
    if (route.name === 'notFound') navigate(paths.gallery, { replace: true })
    else if (isGalleryRoute && !hasConnected)
      navigate(paths.folders, { replace: true })
    else if (route.name === 'album' && albums && !activeAlbum)
      navigate(paths.gallery, { replace: true })
    else if (foldersUrl && index && managerFolderId !== null) {
      // Fix stale or hand-edited folder paths.
      const target = canonicalFoldersUrl ?? paths.folders
      if (target !== foldersUrl) navigate(target, { replace: true })
    }
  }, [
    route.name,
    isGalleryRoute,
    hasConnected,
    albums,
    activeAlbum,
    foldersUrl,
    index,
    managerFolderId,
    canonicalFoldersUrl,
    navigate,
  ])
  const allIds = useMemo(
    () => [...new Set((albums ?? []).flatMap((album) => album.ids))],
    [albums],
  )
  const galleryIds = activeAlbum ? activeAlbum.ids : allIds
  const allPhotosCount = useMemo(() => {
    if (!index || !albums) return undefined
    return allIds.reduce(
      (sum, id) => sum + (index.byId.get(id)?.photoCount ?? 0),
      0,
    )
  }, [index, albums, allIds])

  const title =
    route.name === 'settings'
      ? 'Settings'
      : route.name === 'folders'
        ? 'Manage folders'
        : activeAlbum
          ? activeAlbum.folder.path
          : 'All photos'

  useEffect(() => {
    document.title = `${title} \u2013 Drive Photos`
  }, [title])

  return (
    <div className={styles.layout}>
      <Sidebar
        albums={albums?.map((album) => album.folder)}
        allPhotosCount={allPhotosCount}
        isLoading={folders.isLoading}
        error={folders.error}
        selectedId={activeAlbum?.folder.id ?? null}
        onSelect={(id) => {
          navigate(id === null ? paths.gallery : paths.album(id))
        }}
        email={email.data}
        isGalleryActive={isGalleryRoute}
        isSettingsOpen={route.name === 'settings'}
        onOpenSettings={() => navigate(paths.settings)}
      />
      <main className={styles.content}>
        <h2 className={styles.heading}>{title}</h2>
        {route.name === 'settings' ? (
          <Settings
            onSignOut={() => void signOut()}
            onManageFolders={() => navigate(paths.folders)}
            connectedCount={albums?.length ?? connected.entries.length}
          />
        ) : route.name === 'folders' ? (
          <FolderManager
            index={index}
            currentId={managerFolderId}
            onNavigate={(ids) => navigate(paths.foldersAt(ids))}
            isLoading={folders.isLoading}
            error={folders.error}
            entries={connected.entries}
            onSetFolder={connected.setFolder}
            onClear={connected.clear}
            onDone={() => navigate(paths.gallery)}
          />
        ) : albums ? (
          <Gallery
            key={activeAlbum?.folder.id ?? 'all'}
            token={token}
            folderIds={galleryIds}
          />
        ) : (
          <p>Loading&hellip;</p>
        )}
      </main>
    </div>
  )
}
function App() {
  const { token } = useAuth()
  return token ? <Viewer token={token} /> : <SignIn />
}

export default App
