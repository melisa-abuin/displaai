import { Button } from '../../components/Button'
import type { Adjust } from '../../interfaces'
import { INITIAL_STATE } from '../edit'
import { Slider } from './controls'
import type { PanelProps } from './types'

const ADJUSTMENTS: [keyof Adjust, string, number, number][] = [
  ['brightness', 'Brightness', -100, 100],
  ['contrast', 'Contrast', -100, 100],
  ['saturation', 'Saturation', -100, 100],
  ['warmth', 'Warmth', -100, 100],
  ['fade', 'Fade', 0, 100],
  ['glow', 'Glow', 0, 100],
  ['blur', 'Blur', 0, 100],
  ['vignette', 'Vignette', 0, 100],
  ['grain', 'Grain', 0, 100],
]

export function AdjustPanel({ state, patch }: PanelProps) {
  return (
    <>
      {ADJUSTMENTS.map(([key, label, min, max]) => (
        <Slider
          key={key}
          label={label}
          value={state.adjust[key]}
          min={min}
          max={max}
          onChange={(value) =>
            patch({ adjust: { ...state.adjust, [key]: value } })
          }
        />
      ))}
      <Button
        variant="outline"
        small
        onClick={() => patch({ adjust: INITIAL_STATE.adjust })}
      >
        Reset adjustments
      </Button>
    </>
  )
}
