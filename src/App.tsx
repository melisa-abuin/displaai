import { useEffect, useMemo } from 'react'
import styles from './App.module.css'
import { useAuth } from './auth/context'
import { Button } from './components/Button'
import { FolderManager } from './components/FolderManager'
import { Gallery } from './components/Gallery'
import { PhotoMap } from './components/PhotoMap'
import { Settings } from './components/Settings'
import { Sidebar } from './components/Sidebar'
import { ViewManager } from './components/ViewManager'
import type { DriveFolder } from './drive/api'
import { useConnectedFolders } from './drive/connectedFolders'
import {
  buildFolderIndex,
  descendantIds,
  folderChain,
} from './drive/folderTree'
import {
  useFolders,
  usePhotoCounts,
  usePhotoLocations,
  useTags,
  useUserEmail,
} from './drive/hooks'
import { pruneFilter, type TagFilter } from './drive/tagFilter'
import { useViews, type CustomView } from './drive/views'
import {
  parseRoute,
  paths,
  useFilters,
  useNavigate,
  usePathname,
} from './router'

const ownFilter = (view: CustomView): TagFilter => ({
  tags: view.tags,
  exclude: view.exclude,
  match: view.match,
})

function SignIn() {
  const { signIn, error, isConfigured } = useAuth()
  return (
    <main className={styles.signIn}>
      <img
        className={styles.logo}
        src={`${import.meta.env.BASE_URL}loog.png`}
        alt=""
      />
      <h1>Drive Photos Visualizer</h1>
      <p>
        The app to browse your Google Drive pictures in a smooth way. Sign in
        with Google to start browsing.
      </p>
      <Button
        rounded
        className={styles.signInButton}
        onClick={() => void signIn()}
      >
        Sign in with Google
      </Button>
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
  const { data: allTags } = useTags()
  const [selectedFilter, setSelectedFilter] = useFilters()
  const { views, saveView, removeView } = useViews()
  // Tags that no longer exist (e.g. a stale link, or their last photo was untagged) are ignored.
  const activeFilter = useMemo(() => {
    if (!allTags) return selectedFilter
    return pruneFilter(selectedFilter, new Set(allTags.map((tag) => tag.name)))
  }, [allTags, selectedFilter])

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

  useEffect(() => {
    if (activeFilter !== selectedFilter) setSelectedFilter(activeFilter)
  }, [activeFilter, selectedFilter, setSelectedFilter])

  const hasConnected = albums ? albums.length > 0 : connected.entries.length > 0
  const folderId = route.name === 'album' ? route.folderId : null

  // The sidebar entries: connected folders, with the subfolders of recursive ones beneath them.
  const navItems = useMemo(() => {
    if (!index || !albums) return undefined
    const topLevel = new Set(albums.map((album) => album.folder.id))
    const seen = new Set<string>()
    const items: { folder: DriveFolder; ids: string[]; depth: number }[] = []
    const addSubfolders = (parentId: string, depth: number) => {
      for (const child of index.children.get(parentId) ?? []) {
        if (topLevel.has(child.id) || seen.has(child.id)) continue
        seen.add(child.id)
        items.push({
          folder: { ...child, photoCount: child.totalCount },
          ids: descendantIds(index, child.id),
          depth,
        })
        addSubfolders(child.id, depth + 1)
      }
    }
    const recursive = new Set(
      connected.entries.filter((e) => e.recursive).map((e) => e.id),
    )
    for (const album of albums) {
      seen.add(album.folder.id)
      items.push({ ...album, depth: 0 })
      if (recursive.has(album.folder.id)) addSubfolders(album.folder.id, 1)
    }
    return items
  }, [index, albums, connected.entries])

  const activeAlbum =
    folderId === null
      ? undefined
      : navItems?.find((item) => item.folder.id === folderId)
  const activeView =
    route.name === 'view'
      ? views.find((view) => view.id === route.viewId)
      : undefined
  const isGalleryRoute =
    route.name === 'gallery' || route.name === 'album' || route.name === 'view'
  const needsFolders = isGalleryRoute || route.name === 'map'
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
    else if (needsFolders && !hasConnected)
      navigate(paths.folders, { replace: true })
    else if (route.name === 'album' && navItems && !activeAlbum)
      navigate(paths.gallery, { replace: true })
    else if (route.name === 'view' && !activeView)
      navigate(paths.gallery, { replace: true })
    else if (foldersUrl && index && managerFolderId !== null) {
      // Fix stale or hand-edited folder paths.
      const target = canonicalFoldersUrl ?? paths.folders
      if (target !== foldersUrl) navigate(target, { replace: true })
    }
  }, [
    route.name,
    needsFolders,
    hasConnected,
    navItems,
    activeAlbum,
    activeView,
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
  const galleryIds = useMemo(() => {
    if (!index) return []
    // Only folders that directly hold photos get a section, ordered by path.
    return (activeAlbum ? activeAlbum.ids : allIds)
      .filter((id) => (index.byId.get(id)?.photoCount ?? 0) > 0)
      .sort((a, b) =>
        index.byId.get(a)!.path.localeCompare(index.byId.get(b)!.path),
      )
  }, [index, activeAlbum, allIds])
  // Each view's folders (with everything inside, only those enabled in Manage folders),
  // or every enabled folder when it picked none; plus the filter of its own tags.
  const viewSets = useMemo(() => {
    if (!index) return []
    const enabled = new Set(allIds)
    return views.map((view) => {
      const ids = new Set<string>()
      if (view.folders.length === 0) for (const id of allIds) ids.add(id)
      else
        for (const { id } of view.folders)
          if (index.byId.has(id))
            for (const d of descendantIds(index, id))
              if (enabled.has(d)) ids.add(d)
      return {
        view,
        folderIds: [...ids].filter(
          (id) => (index.byId.get(id)?.photoCount ?? 0) > 0,
        ),
        filters: [ownFilter(view)],
      }
    })
  }, [views, index, allIds])
  const viewCounts = usePhotoCounts(viewSets)
  // Photos with a location in the enabled folders, whatever the sidebar filter.
  const locations = usePhotoLocations(allIds)
  const viewItems = useMemo(
    () =>
      viewSets.map(({ view }, i) => ({
        id: view.id,
        name: view.name,
        count: viewCounts?.[i],
      })),
    [viewSets, viewCounts],
  )
  const viewIds = useMemo(
    () =>
      viewSets.find((set) => set.view.id === activeView?.id)?.folderIds ?? [],
    [viewSets, activeView],
  )
  const filters = useMemo<TagFilter[]>(
    () => (activeView ? [ownFilter(activeView), activeFilter] : [activeFilter]),
    [activeView, activeFilter],
  )
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
      : route.name === 'map'
        ? 'Map'
        : route.name === 'folders'
          ? 'Manage folders'
          : route.name === 'views'
            ? 'Manage views'
            : activeView
              ? activeView.name
              : activeAlbum
                ? activeAlbum.folder.path
                : 'All photos'

  useEffect(() => {
    document.title = `${title} \u2013 Drive Photos`
  }, [title])

  return (
    <div className={styles.layout}>
      <Sidebar
        albums={navItems}
        allPhotosCount={allPhotosCount}
        isLoading={folders.isLoading}
        error={folders.error}
        selectedId={activeAlbum?.folder.id ?? null}
        onSelect={(id) => {
          navigate(id === null ? paths.gallery : paths.album(id))
        }}
        email={email.data}
        isGalleryActive={isGalleryRoute && !activeView}
        isSettingsOpen={
          route.name === 'settings' ||
          route.name === 'views' ||
          route.name === 'folders'
        }
        onOpenSettings={() => navigate(paths.settings)}
        mapCount={locations.isLoading ? undefined : locations.data.length}
        isMapActive={route.name === 'map'}
        onOpenMap={() => navigate(paths.map)}
        tags={allTags}
        filter={activeFilter}
        onFilterChange={setSelectedFilter}
        views={viewItems}
        selectedViewId={activeView?.id ?? null}
        onSelectView={(id) => navigate(paths.view(id))}
      />
      <main className={styles.content}>
        <h2
          className={`${styles.heading} ${route.name === 'folders' ? styles.headingPrimary : ''}`}
        >
          {title}
        </h2>
        {route.name === 'settings' ? (
          <Settings
            onSignOut={() => void signOut()}
            onManageFolders={() => navigate(paths.folders)}
            connectedCount={albums?.length ?? connected.entries.length}
            onManageViews={() => navigate(paths.views)}
            viewCount={views.length}
          />
        ) : route.name === 'views' ? (
          <ViewManager
            views={views}
            editingId={route.viewId}
            folders={navItems}
            tags={allTags}
            onEdit={(id) =>
              navigate(id === undefined ? paths.views : paths.editView(id))
            }
            onSave={(view) => {
              saveView(view)
              navigate(paths.views)
            }}
            onRemove={removeView}
            onOpen={(id) => navigate(paths.view(id))}
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
        ) : albums && route.name === 'map' ? (
          <PhotoMap
            folderIds={allIds}
            folders={index?.byId}
            filters={filters}
          />
        ) : albums ? (
          <Gallery
            key={
              activeView
                ? `view:${activeView.id}`
                : (activeAlbum?.folder.id ?? 'all')
            }
            token={token}
            folderIds={activeView ? viewIds : galleryIds}
            grouped={activeAlbum !== undefined && !activeView}
            folders={index?.byId}
            rootPath={activeAlbum?.folder.path}
            filters={filters}
            emptyMessage={activeView ? 'No photos in this view.' : undefined}
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
