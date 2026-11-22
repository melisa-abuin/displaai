import { MEDIA_KINDS } from '../../../lib/constants'
import type { MediaKind } from '../../../interfaces'
import { useMediaKinds } from '../hooks/useMediaKinds'
import { SettingsSection } from './SettingsSection'
import { ToggleRow } from './ToggleRow'

export function MediaTypesSection() {
  const [mediaKinds, setMediaKinds] = useMediaKinds()

  const toggleKind = (kind: MediaKind, checked: boolean) => {
    const next = new Set(mediaKinds)
    if (checked) next.add(kind)
    else next.delete(kind)
    setMediaKinds(next)
  }

  return (
    <SettingsSection
      id="media"
      title="Media types"
      hint="Choose what shows up in the gallery, views and map. Images covers every picture format except GIFs. Videos are downloaded when opened and can't be edited."
    >
      {MEDIA_KINDS.map(({ value, label }) => (
        <ToggleRow
          key={value}
          label={label}
          checked={mediaKinds.has(value)}
          // At least one type has to stay on, or the app would be empty.
          disabled={mediaKinds.has(value) && mediaKinds.size === 1}
          onChange={(checked) => toggleKind(value, checked)}
        />
      ))}
    </SettingsSection>
  )
}
