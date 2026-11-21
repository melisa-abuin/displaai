import { Button } from '../../components/Button'
import styles from '../PhotoEditor.module.css'
import { Chips, Slider } from './controls'
import type { PanelProps } from './types'

export const RATIOS: {
  id: string
  label: string
  value: number | 'original' | null
}[] = [
  { id: 'free', label: 'Free', value: null },
  { id: 'original', label: 'Original', value: 'original' },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '2:3', label: '2:3', value: 2 / 3 },
]

export function CropPanel({
  state,
  patch,
  ratioId,
  onPickRatio,
  onRotate,
}: PanelProps & {
  ratioId: string
  onPickRatio: (id: string) => void
  onRotate: (turns: number) => void
}) {
  return (
    <>
      <h3>Aspect ratio</h3>
      <Chips
        label="Aspect ratio"
        value={ratioId}
        onChange={onPickRatio}
        options={RATIOS.map((r) => [r.id, r.label])}
      />
      <h3>Rotate &amp; flip</h3>
      <div className={styles.row}>
        <Button variant="outline" small onClick={() => onRotate(-1)}>
          ⟲ Left
        </Button>
        <Button variant="outline" small onClick={() => onRotate(1)}>
          ⟳ Right
        </Button>
        <Button
          variant="outline"
          small
          onClick={() => patch({ flipX: !state.flipX })}
        >
          ⇋ Flip
        </Button>
        <Button
          variant="outline"
          small
          onClick={() => patch({ flipY: !state.flipY })}
        >
          ⇅ Mirror
        </Button>
      </div>
      <Slider
        label="Straighten"
        value={state.angle}
        min={-45}
        max={45}
        step={0.5}
        suffix="°"
        onChange={(angle) => patch({ angle })}
      />
      <p className={styles.hint}>
        Drag the box on the photo to choose what to keep.
      </p>
    </>
  )
}
