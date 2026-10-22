import type { DriveFolder } from '../drive/api'
import { formatNumber } from '../format'
import styles from './Sidebar.module.css'

interface SidebarProps {
  albums: DriveFolder[] | undefined
  allPhotosCount: number | undefined
  isGalleryActive: boolean
  isLoading: boolean
  error: Error | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  email: string | null | undefined
  isSettingsOpen: boolean
  onOpenSettings: () => void
  isMapActive: boolean
  onOpenMap: () => void
}

export function Sidebar({
  albums,
  allPhotosCount,
  isGalleryActive,
  isLoading,
  error,
  selectedId,
  onSelect,
  email,
  isSettingsOpen,
  onOpenSettings,
  isMapActive,
  onOpenMap,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Albums">
      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}loog.png`}
          alt=""
        />
        <h1 className={styles.title} title="Drive Photos Visualizer">
          DPV
        </h1>
      </div>
      <nav className={styles.nav}>
        <button
          type="button"
          className={styles.item}
          aria-current={
            isGalleryActive && selectedId === null ? 'true' : undefined
          }
          onClick={() => onSelect(null)}
        >
          <span className={styles.name}>All photos</span>
          {allPhotosCount !== undefined && (
            <>
              {' '}
              <span className={styles.count}>{formatNumber(allPhotosCount)}</span>
            </>
          )}
        </button>
        {isLoading && <p className={styles.status}>Loading albums&hellip;</p>}
        {error && (
          <p role="alert" className={styles.status}>
            Could not load albums.
          </p>
        )}
        {albums?.map((album) => (
          <button
            key={album.id}
            type="button"
            className={styles.item}
            aria-current={
              isGalleryActive && selectedId === album.id ? 'true' : undefined
            }
            onClick={() => onSelect(album.id)}
          >
            <span className={styles.name}>{album.name}</span>{' '}
            <span className={styles.count}>{formatNumber(album.photoCount)}</span>
          </button>
        ))}
        <button
          type="button"
          className={styles.item}
          aria-current={isMapActive ? 'true' : undefined}
          onClick={onOpenMap}
        >
          <span className={styles.name}>Map</span>
        </button>
      </nav>
      <div className={styles.account}>
        <span className={styles.email} title={email ?? undefined}>
          {email}
        </span>
        <button
          type="button"
          className={styles.settingsButton}
          aria-label="Settings"
          aria-current={isSettingsOpen ? 'page' : undefined}
          onClick={onOpenSettings}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
