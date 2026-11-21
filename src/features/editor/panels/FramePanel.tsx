import styles from '../PhotoEditor.module.css'
import { Chips, Slider } from './controls'
import type { PanelProps } from './types'

const FRAME_COLORS = ['#ffffff', '#000000', '#f6a655', '#aa85f8', '#ff5d8f']

export function FramePanel({ state, patch }: PanelProps) {
  return (
    <>
      <Chips
        label="Frame style"
        value={state.frame.style}
        onChange={(style) =>
          patch({
            frame: {
              ...state.frame,
              style,
              size: style === 'polaroid' ? 6 : state.frame.size,
            },
          })
        }
        options={[
          ['none', 'None'],
          ['solid', 'Border'],
          ['polaroid', 'Polaroid'],
        ]}
      />
      {state.frame.style !== 'none' && (
        <>
          <Slider
            label="Thickness"
            value={state.frame.size}
            min={1}
            max={20}
            suffix="%"
            onChange={(size) => patch({ frame: { ...state.frame, size } })}
          />
          <div className={styles.swatches}>
            {FRAME_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Frame colour ${color}`}
                aria-pressed={state.frame.color === color}
                style={{ background: color }}
                onClick={() => patch({ frame: { ...state.frame, color } })}
              />
            ))}
            <input
              type="color"
              aria-label="Custom frame colour"
              value={state.frame.color}
              onChange={(e) =>
                patch({ frame: { ...state.frame, color: e.target.value } })
              }
            />
          </div>
        </>
      )}
    </>
  )
}
