import type { ReactNode } from 'react'
import { Button } from '../../../ui/Button'
import styles from '../Settings.module.css'
import { SettingsSection } from './SettingsSection'

interface ManageSectionProps {
  id: string
  title: string
  summary: string
  actionLabel: string
  onAction: () => void
  hint?: ReactNode
}

/** A section that summarises something and links to the page that manages it. */
export function ManageSection({
  id,
  title,
  summary,
  actionLabel,
  onAction,
  hint,
}: ManageSectionProps) {
  return (
    <SettingsSection id={id} title={title} hint={hint}>
      <div className={styles.row}>
        <span>{summary}</span>
        <Button small onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </SettingsSection>
  )
}
