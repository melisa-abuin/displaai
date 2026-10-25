import { formatNumber } from '../format'
import { reloadApp } from '../queryClient'
import { useLocalAi } from '../settings'
import { Button } from './Button'
import styles from './Settings.module.css'
import { Switch } from './Switch'

interface SettingsProps {
  onSignOut: () => void
  onManageFolders: () => void
  connectedCount: number
  onManageViews: () => void
  viewCount: number
}

export function Settings({
  onSignOut,
  onManageFolders,
  connectedCount,
  onManageViews,
  viewCount,
}: SettingsProps) {
  const [localAi, setLocalAi] = useLocalAi()
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

      <section aria-labelledby="settings-views">
        <h3 id="settings-views" className={styles.sectionTitle}>
          Views
        </h3>
        <div className={styles.row}>
          <span>{formatNumber(viewCount)} custom</span>
          <Button onClick={onManageViews}>Manage views</Button>
        </div>
        <p className={styles.hint}>
          Saved galleries in the sidebar that combine folders with tags to
          include or exclude.
        </p>
      </section>

      <section aria-labelledby="settings-ai">
        <h3 id="settings-ai" className={styles.sectionTitle}>
          Smart features
        </h3>
        <div className={styles.row}>
          <span>Local AI scanning</span>
          <Switch
            aria-label="Local AI scanning"
            checked={localAi}
            onChange={(e) => setLocalAi(e.target.checked)}
          />
        </div>
        <p className={styles.hint}>
          Detects faces, objects and suggested tags in the photo viewer. Runs in
          your browser; photos are not sent anywhere.
        </p>
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
        {import.meta.env.DEV && (
          <Button
            onClick={reloadApp}
            title="Reloading can help with issues like outdated cache or version conflicts."
          >
            Reload App
          </Button>
        )}
      </div>
    </div>
  )
}
