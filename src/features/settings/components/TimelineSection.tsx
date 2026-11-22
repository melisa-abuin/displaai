import { useTimeline } from '../hooks/useTimeline'
import { SettingsSection } from './SettingsSection'
import { ToggleRow } from './ToggleRow'

export function TimelineSection() {
  const [timeline, setTimeline] = useTimeline()
  return (
    <SettingsSection
      id="timeline"
      title="Timeline"
      hint="A bar next to the gallery to jump to a month or year."
    >
      <ToggleRow
        label="Show timeline"
        checked={timeline}
        onChange={setTimeline}
      />
    </SettingsSection>
  )
}
