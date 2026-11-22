import type { ReactNode } from 'react'
import { useUserEmail } from '../../../drive/hooks'
import type { ViewMode } from '../../../interfaces'
import { SettingsIcon } from '../../../ui/icons/Icons'
import { VIEW_MODE_OPTIONS } from '../constants'
import styles from '../Sidebar.module.css'

function Account({
  token,
  isSettingsOpen,
  onOpenSettings,
}: Pick<DesktopSidebarProps, 'token' | 'isSettingsOpen' | 'onOpenSettings'>) {
  const { data: email } = useUserEmail(token)
  return (
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
        <SettingsIcon width="20" height="20" />
      </button>
    </div>
  )
}

interface DesktopSidebarProps {
  token: string
  mode: ViewMode
  isSettingsOpen: boolean
  onModeChange: (mode: ViewMode) => void
  onOpenSettings: () => void
  /** The folders and tags. */
  children: ReactNode
}

export function DesktopSidebar({
  token,
  mode,
  isSettingsOpen,
  onModeChange,
  onOpenSettings,
  children,
}: DesktopSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Albums">
      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
        />
        <h1 className={styles.title}>Displaai</h1>
      </div>
      <div className={styles.mode} role="group" aria-label="View">
        {VIEW_MODE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={styles.modeOption}
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {children}
      <Account
        token={token}
        isSettingsOpen={isSettingsOpen}
        onOpenSettings={onOpenSettings}
      />
    </aside>
  )
}
