import { useLocalAi } from '../hooks/useLocalAi'
import { SettingsSection } from './SettingsSection'
import { ToggleRow } from './ToggleRow'

export function SmartFeaturesSection() {
  const [localAi, setLocalAi] = useLocalAi()
  return (
    <SettingsSection
      id="ai"
      title="Smart features"
      hint="Detects faces, objects and suggested tags in the photo viewer. Runs in your browser; photos are not sent anywhere."
    >
      <ToggleRow
        label="Local AI scanning"
        checked={localAi}
        onChange={setLocalAi}
      />
    </SettingsSection>
  )
}
