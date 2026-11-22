import type { ReactNode } from 'react'
import type { ViewMode } from '../../../interfaces'
import {
  CloseIcon,
  FolderIcon,
  MapIcon,
  PhotosIcon,
  SettingsIcon,
} from '../../../ui/icons/Icons'
import styles from '../Sidebar.module.css'

interface TabProps {
  label: string
  isCurrent?: boolean
  isExpanded?: boolean
  onClick: () => void
  children: ReactNode
}

function Tab({ label, isCurrent, isExpanded, onClick, children }: TabProps) {
  return (
    <button
      type="button"
      className={styles.tab}
      aria-label={label}
      title={label}
      aria-current={isCurrent ? 'page' : undefined}
      aria-expanded={isExpanded}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface MobileNavProps {
  mode: ViewMode
  isSettingsOpen: boolean
  isDrawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
  onModeChange: (mode: ViewMode) => void
  onOpenSettings: () => void
  /** The folders and tags shown in the drawer. */
  children: ReactNode
}

/** The bottom bar, with the folders in a drawer above it. */
export function MobileNav({
  mode,
  isSettingsOpen,
  isDrawerOpen,
  onDrawerOpenChange,
  onModeChange,
  onOpenSettings,
  children,
}: MobileNavProps) {
  const closeThen = (action: () => void) => () => {
    onDrawerOpenChange(false)
    action()
  }

  return (
    <>
      {isDrawerOpen && (
        <>
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={() => onDrawerOpenChange(false)}
          />
          <section
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Folders"
          >
            <div className={styles.drawerHeader}>
              <span className={styles.handle} aria-hidden="true" />
              <h2 className={styles.drawerTitle}>Folders</h2>
              <button
                type="button"
                className={styles.settingsButton}
                aria-label="Close folders"
                onClick={() => onDrawerOpenChange(false)}
              >
                <CloseIcon />
              </button>
            </div>
            {children}
          </section>
        </>
      )}
      <nav className={styles.bottomBar} aria-label="Main">
        <Tab
          label="Photos"
          isCurrent={mode === 'photos' && !isSettingsOpen}
          onClick={closeThen(() => onModeChange('photos'))}
        >
          <PhotosIcon />
        </Tab>
        <Tab
          label="Map"
          isCurrent={mode === 'map' && !isSettingsOpen}
          onClick={closeThen(() => onModeChange('map'))}
        >
          <MapIcon />
        </Tab>
        <Tab
          label="Folders"
          isExpanded={isDrawerOpen}
          onClick={() => onDrawerOpenChange(!isDrawerOpen)}
        >
          <FolderIcon />
        </Tab>
        <Tab
          label="Settings"
          isCurrent={isSettingsOpen}
          onClick={closeThen(onOpenSettings)}
        >
          <SettingsIcon />
        </Tab>
      </nav>
    </>
  )
}
