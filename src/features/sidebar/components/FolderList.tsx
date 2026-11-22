import { memo } from 'react'
import { useLibraryStatus } from '../../../drive/hooks'
import type { SidebarAlbum, SidebarView } from '../../../interfaces'
import { visibleAlbums } from '../utils/albumTree'
import { FolderRow } from './FolderRow'
import { NavItem } from './NavItem'
import styles from '../Sidebar.module.css'

interface FolderListProps {
  albums: SidebarAlbum[] | undefined
  allPhotosCount: number | undefined
  views: readonly SidebarView[]
  /** Whether a folder or view of the browse pages is the current page. */
  isBrowseActive: boolean
  selectedId: string | null
  selectedViewId: string | null
  expanded: ReadonlySet<string>
  onToggle: (id: string) => void
  onSelectFolder: (id: string | null) => void
  onSelectView: (id: string) => void
}

/** "All folders", the connected folders and the saved views. */
export const FolderList = memo(function FolderList({
  albums,
  allPhotosCount,
  views,
  isBrowseActive,
  selectedId,
  selectedViewId,
  expanded,
  onToggle,
  onSelectFolder,
  onSelectView,
}: FolderListProps) {
  const { isLoading, error } = useLibraryStatus()

  return (
    <nav className={styles.nav}>
      <NavItem
        label="All folders"
        count={allPhotosCount}
        isCurrent={
          isBrowseActive && selectedId === null && selectedViewId === null
        }
        onClick={() => onSelectFolder(null)}
      />
      {isLoading && <p className={styles.status}>Loading albums&hellip;</p>}
      {error && (
        <p role="alert" className={styles.status}>
          Could not load albums.
        </p>
      )}
      {albums &&
        visibleAlbums(albums, expanded).map(({ album, hasChildren }) => (
          <FolderRow
            key={album.folder.id}
            album={album}
            hasChildren={hasChildren}
            isOpen={expanded.has(album.folder.id)}
            isCurrent={isBrowseActive && selectedId === album.folder.id}
            onToggle={onToggle}
            onSelect={onSelectFolder}
          />
        ))}
      {views.map((view) => (
        <NavItem
          key={view.id}
          label={view.name}
          count={view.count}
          isCurrent={selectedViewId === view.id}
          onClick={() => onSelectView(view.id)}
        />
      ))}
    </nav>
  )
})
