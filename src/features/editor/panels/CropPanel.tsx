import { Button } from '../../../ui/Button'
import styles from '../PhotoEditor.module.css'
import { Chips, Slider } from './controls'
import type { PanelProps } from './types'
import { RATIOS } from '../constants'

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
