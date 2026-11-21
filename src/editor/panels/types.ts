import type { EditState } from '../../interfaces'

/** Props shared by the panels that edit a slice of the edit state. */
export interface PanelProps {
  state: EditState
  patch: (changes: Partial<EditState>) => void
}
