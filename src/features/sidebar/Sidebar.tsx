import { useCallback, useEffect, useState } from 'react'
import type {
  SidebarAlbum,
  SidebarView,
  TagCount,
  ViewMode,
} from '../../interfaces'
import { DesktopSidebar } from './components/DesktopSidebar'
import { FolderList } from './components/FolderList'
import { MobileNav } from './components/MobileNav'
import { TagFilters } from './components/TagFilters'
import { useExpandedFolders } from './hooks/useExpandedFolders'
import { useIsMobile } from './hooks/useIsMobile'

interface SidebarProps {
  token: string
  albums: SidebarAlbum[] | undefined
  allPhotosCount: number | undefined
  tags: TagCount[] | undefined
  views: readonly SidebarView[]
  isBrowseActive: boolean
  isSettingsOpen: boolean
  selectedId: string | null
  selectedViewId: string | null
  /** Whether the folders show as a photo grid or on the map. */
  mode: ViewMode
  /** The callbacks should be stable so the lists below can skip re-rendering. */
  onSelect: (id: string | null) => void
  onSelectView: (id: string) => void
  onModeChange: (mode: ViewMode) => void
  onOpenSettings: () => void
}

export function Sidebar({
  token,
  albums,
  allPhotosCount,
  tags,
  views,
  isBrowseActive,
  isSettingsOpen,
  selectedId,
  selectedViewId,
  mode,
  onSelect,
  onSelectView,
  onModeChange,
  onOpenSettings,
}: SidebarProps) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [expanded, toggleFolder] = useExpandedFolders(albums, selectedId)
  const isDrawerOpen = isMobile && drawerOpen

  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDrawerOpen])

  const pickFolder = useCallback(
    (id: string | null) => {
      setDrawerOpen(false)
      onSelect(id)
    },
    [onSelect],
  )
  const pickView = useCallback(
    (id: string) => {
      setDrawerOpen(false)
      onSelectView(id)
    },
    [onSelectView],
  )
  const toggleTags = useCallback(() => setTagsOpen((open) => !open), [])

  const content = (
    <>
      <FolderList
        albums={albums}
        allPhotosCount={allPhotosCount}
        views={views}
        isBrowseActive={isBrowseActive}
        selectedId={selectedId}
        selectedViewId={selectedViewId}
        expanded={expanded}
        onToggle={toggleFolder}
        onSelectFolder={pickFolder}
        onSelectView={pickView}
      />
      {!isSettingsOpen && (
        <TagFilters tags={tags} isOpen={tagsOpen} onToggle={toggleTags} />
      )}
    </>
  )

  if (isMobile) {
    return (
      <MobileNav
        mode={mode}
        isSettingsOpen={isSettingsOpen}
        isDrawerOpen={isDrawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        onModeChange={onModeChange}
        onOpenSettings={onOpenSettings}
      >
        {content}
      </MobileNav>
    )
  }

  return (
    <DesktopSidebar
      token={token}
      mode={mode}
      isSettingsOpen={isSettingsOpen}
      onModeChange={onModeChange}
      onOpenSettings={onOpenSettings}
    >
      {content}
    </DesktopSidebar>
  )
}
