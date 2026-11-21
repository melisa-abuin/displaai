import styles from '../PhotoEditor.module.css'
import { MAX_SOURCE_SIDE } from '../edit'
import type { PanelProps } from './types'

const SIZE_PRESETS = [4096, 2048, 1080, 720, 480]

export function SizePanel({
  state,
  patch,
  size,
  outHeight,
}: PanelProps & {
  /** Size after cropping, before any resize. */
  size: { w: number; h: number }
  outHeight: number
}) {
  const widthValue = state.width ?? size.w

  return (
    <>
      <h3>Longest side</h3>
      <div className={styles.chips}>
        <button
          type="button"
          className={state.width === null ? styles.chipActive : styles.chip}
          onClick={() => patch({ width: null })}
        >
          Original
        </button>
        {SIZE_PRESETS.map((side) => {
          const long = Math.max(size.w, size.h)
          const width = Math.round(
            size.w >= size.h ? side : (side * size.w) / size.h,
          )
          return (
            <button
              key={side}
              type="button"
              disabled={side >= long}
              className={
                state.width === width ? styles.chipActive : styles.chip
              }
              onClick={() => patch({ width })}
            >
              {side}px
            </button>
          )
        })}
      </div>
      <h3>Custom</h3>
      <div className={styles.row}>
        <label className={styles.inline}>
          Width
          <input
            type="number"
            min={16}
            max={8192}
            value={widthValue}
            onChange={(e) => {
              const v = Math.round(Number(e.target.value))
              patch({ width: v >= 1 ? Math.min(8192, v) : null })
            }}
          />
        </label>
        <label className={styles.inline}>
          Height
          <input
            type="number"
            min={16}
            max={8192}
            value={outHeight}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v >= 1)
                patch({
                  width: Math.min(
                    8192,
                    Math.max(1, Math.round((v * size.w) / size.h)),
                  ),
                })
            }}
          />
        </label>
      </div>
      <p className={styles.hint}>
        The proportions stay locked. The editor works from up to{' '}
        {MAX_SOURCE_SIDE}px of the original, so larger sizes add no detail.
      </p>
    </>
  )
}
