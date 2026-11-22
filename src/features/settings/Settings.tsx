import { formatNumber } from '../../lib/format'
import styles from './Settings.module.css'
import { AboutSection } from './components/AboutSection'
import { ManageSection } from './components/ManageSection'
import { MediaTypesSection } from './components/MediaTypesSection'
import { SettingsFooter } from './components/SettingsFooter'
import { SmartFeaturesSection } from './components/SmartFeaturesSection'
import { TimelineSection } from './components/TimelineSection'

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
  return (
    <div className={styles.settings}>
      <ManageSection
        id="folders"
        title="Folders"
        summary={`${formatNumber(connectedCount)} connected`}
        actionLabel="Manage folders"
        onAction={onManageFolders}
      />
      <ManageSection
        id="views"
        title="Views"
        summary={`${formatNumber(viewCount)} custom`}
        actionLabel="Manage views"
        onAction={onManageViews}
        hint="Saved galleries in the sidebar that combine folders with tags to include or exclude."
      />
      <MediaTypesSection />
      <TimelineSection />
      <SmartFeaturesSection />
      <AboutSection />
      <SettingsFooter onSignOut={onSignOut} />
    </div>
  )
}
