import { formatNumber } from '../format'
import { Button } from './Button'
import styles from './Settings.module.css'

interface SettingsProps {
  onSignOut: () => void
  onManageFolders: () => void
  connectedCount: number
}

// Placeholder controls: they are not wired to any behavior yet.
export function Settings({
  onSignOut,
  onManageFolders,
  connectedCount,
}: SettingsProps) {
  return (
    <div className={styles.settings}>
      <section aria-labelledby="settings-folders">
        <h3 id="settings-folders" className={styles.sectionTitle}>
          Folders
        </h3>
        <div className={styles.row}>
          <span>{formatNumber(connectedCount)} connected</span>
          <Button onClick={onManageFolders}>Manage folders</Button>
        </div>
      </section>

      <section aria-labelledby="settings-general">
        <h3 id="settings-general" className={styles.sectionTitle}>
          General
        </h3>
        <label className={styles.row}>
          <span>Theme</span>
          <select defaultValue="system">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className={styles.row}>
          <span>Thumbnail size</span>
          <select defaultValue="medium">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className={styles.row}>
          <span>Show file names</span>
          <input type="checkbox" />
        </label>
        <label className={styles.row}>
          <span>Open albums on startup</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label className={styles.row}>
          <span>Enable notifications</span>
          <input type="checkbox" />
        </label>
      </section>

      <section aria-labelledby="settings-about">
        <h3 id="settings-about" className={styles.sectionTitle}>
          About
        </h3>
        <dl className={styles.about}>
          <dt>Name</dt>
          <dd>{__APP_NAME__}</dd>
          <dt>Version</dt>
          <dd>{__APP_VERSION__}</dd>
        </dl>
      </section>

      <div className={styles.footer}>
        <Button onClick={onSignOut}>Log out</Button>
      </div>
    </div>
  )
}
