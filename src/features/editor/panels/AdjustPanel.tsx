import { Button } from '../../../ui/Button'
import { Slider } from './controls'
import type { PanelProps } from './types'
import { ADJUSTMENTS, INITIAL_STATE } from '../constants'

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
