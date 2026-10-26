import { formatNumber } from '../format'
import { MEDIA_KINDS } from '../mediaKind'
import { reloadApp } from '../queryClient'
import { useLocalAi, useMediaKinds, useTimeline } from '../settings'
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
  const [mediaKinds, setMediaKinds] = useMediaKinds()
  const [timeline, setTimeline] = useTimeline()
  return (
    <div className={styles.settings}>
      <section aria-labelledby="settings-folders">
        <h3 id="settings-folders" className={styles.sectionTitle}>
          Folders
        </h3>
        <div className={styles.row}>
          <span>{formatNumber(connectedCount)} connected</span>
          <Button small onClick={onManageFolders}>
            Manage folders
          </Button>
        </div>
      </section>

      <section aria-labelledby="settings-views">
        <h3 id="settings-views" className={styles.sectionTitle}>
          Views
        </h3>
        <div className={styles.row}>
          <span>{formatNumber(viewCount)} custom</span>
          <Button small onClick={onManageViews}>
            Manage views
          </Button>
        </div>
        <p className={styles.hint}>
          Saved galleries in the sidebar that combine folders with tags to
          include or exclude.
        </p>
      </section>

      <section aria-labelledby="settings-media">
        <h3 id="settings-media" className={styles.sectionTitle}>
          Media types
        </h3>
        {MEDIA_KINDS.map(({ value, label }) => (
          <div key={value} className={styles.row}>
            <span>{label}</span>
            <Switch
              aria-label={label}
              checked={mediaKinds.has(value)}
              // At least one type has to stay on, or the app would be empty.
              disabled={mediaKinds.has(value) && mediaKinds.size === 1}
              onChange={(e) => {
                const next = new Set(mediaKinds)
                if (e.target.checked) next.add(value)
                else next.delete(value)
                setMediaKinds(next)
              }}
            />
          </div>
        ))}
        <p className={styles.hint}>
          Choose what shows up in the gallery, views and map. Images covers
          every picture format except GIFs. Videos are downloaded when opened
          and can't be edited.
        </p>
      </section>

      <section aria-labelledby="settings-timeline">
        <h3 id="settings-timeline" className={styles.sectionTitle}>
          Timeline
        </h3>
        <div className={styles.row}>
          <span>Show timeline</span>
          <Switch
            aria-label="Show timeline"
            checked={timeline}
            onChange={(e) => setTimeline(e.target.checked)}
          />
        </div>
        <p className={styles.hint}>
          A bar next to the gallery to jump to a month or year.
        </p>
      </section>

      <section aria-labelledby="settings-ai">
        {' '}
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
