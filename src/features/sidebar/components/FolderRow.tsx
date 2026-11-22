import { memo } from 'react'
import type { SidebarAlbum } from '../../../interfaces'
import { ChevronIcon } from '../../../ui/icons/Icons'
import { FOLDER_INDENT_PX } from '../constants'
import { NavItem } from './NavItem'
import styles from '../Sidebar.module.css'

interface FolderRowProps {
  album: SidebarAlbum
  hasChildren: boolean
  isOpen: boolean
  isCurrent: boolean
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}

export const FolderRow = memo(function FolderRow({
  album,
  hasChildren,
  isOpen,
  isCurrent,
  onToggle,
  onSelect,
}: FolderRowProps) {
  const { folder, depth } = album
  return (
    <div
      className={styles.row}
      style={{ paddingLeft: `${depth * FOLDER_INDENT_PX}px` }}
    >
      {hasChildren ? (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`}
          onClick={() => onToggle(folder.id)}
        >
          <ChevronIcon className={isOpen ? styles.chevronOpen : undefined} />
        </button>
      ) : (
        <span className={styles.toggle} aria-hidden="true" />
      )}
      <NavItem
        label={folder.name}
        count={folder.photoCount}
        title={folder.path}
        isCurrent={isCurrent}
        onClick={() => onSelect(folder.id)}
      />
    </div>
  )
})
