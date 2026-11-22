import styles from '../Settings.module.css'
import { SettingsSection } from './SettingsSection'

export function AboutSection() {
  return (
    <SettingsSection id="about" title="About">
      <dl className={styles.about}>
        <dt>Name</dt>
        <dd>{__APP_NAME__}</dd>
        <dt>Version</dt>
        <dd>{__APP_VERSION__}</dd>
        <dt>Privacy</dt>
        <dd>
          <a
            href={`${import.meta.env.BASE_URL}privacy.html`}
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
        </dd>
      </dl>
    </SettingsSection>
  )
}
