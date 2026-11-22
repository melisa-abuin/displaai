import type { ReactNode } from 'react'
import styles from '../Settings.module.css'

interface SettingsSectionProps {
  /** Used for the heading id, which labels the section. */
  id: string
  title: string
  /** Explanation shown beneath the content. */
  hint?: ReactNode
  children?: ReactNode
}

export function SettingsSection({
  id,
  title,
  hint,
  children,
}: SettingsSectionProps) {
  const headingId = `settings-${id}`
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
      {hint && <p className={styles.hint}>{hint}</p>}
    </section>
  )
}
