import type { Region } from '../vision/vision'
import styles from './RegionBoxes.module.css'

const percent = (fraction: number) => `${fraction * 100}%`

/** Outlines regions; the parent must be positioned and sized like the image. */
export function RegionBoxes({
  regions,
  kind,
}: {
  regions: readonly Region[]
  kind: 'face' | 'object'
}) {
  if (regions.length === 0) return null
  return (
    <span className={styles.layer} aria-hidden="true">
      {regions.map((region, i) => (
        <span
          key={i}
          className={`${styles.box} ${kind === 'face' ? styles.face : styles.object}`}
          style={{
            left: percent(region.x),
            top: percent(region.y),
            width: percent(region.width),
            height: percent(region.height),
          }}
          data-testid={`${kind}-box`}
        >
          {kind === 'object' && region.label && (
            <span className={styles.label}>{region.label}</span>
          )}
        </span>
      ))}
    </span>
  )
}
