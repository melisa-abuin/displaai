import { useRef } from 'react'
import type { Crop } from './edit'
import styles from './PhotoEditor.module.css'

const MIN = 0.05
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Handle = (typeof HANDLES)[number]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Draggable crop rectangle over the image. `ratio` (width / height in pixels)
 * locks the shape; `imageAspect` is the width / height of the image shown.
 */
export function CropBox({
  crop,
  onChange,
  ratio,
  imageAspect,
}: {
  crop: Crop
  onChange: (crop: Crop) => void
  ratio: number | null
  imageAspect: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    handle: Handle | 'move'
    startX: number
    startY: number
    crop: Crop
  } | null>(null)

  const point = (e: React.PointerEvent) => {
    const rect = box.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const start = (handle: Handle | 'move') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    drag.current = { handle, startX: p.x, startY: p.y, crop }
  }

  const resize = (handle: Handle, from: Crop, p: { x: number; y: number }) => {
    if (ratio) {
      const dirX = handle.includes('w') ? -1 : 1
      const dirY = handle.includes('n') ? -1 : 1
      const ax = dirX < 0 ? from.x + from.w : from.x
      const ay = dirY < 0 ? from.y + from.h : from.y
      const maxW = dirX < 0 ? ax : 1 - ax
      const maxH = dirY < 0 ? ay : 1 - ay
      let w = clamp(dirX * (p.x - ax), MIN, maxW)
      let h = (w * imageAspect) / ratio
      if (h > maxH) {
        h = maxH
        w = (h * ratio) / imageAspect
      }
      return { x: dirX < 0 ? ax - w : ax, y: dirY < 0 ? ay - h : ay, w, h }
    }
    let { x, y, w, h } = from
    if (handle.includes('w')) {
      const next = clamp(p.x, 0, x + w - MIN)
      w = x + w - next
      x = next
    } else if (handle.includes('e')) {
      w = clamp(p.x - x, MIN, 1 - x)
    }
    if (handle.includes('n')) {
      const next = clamp(p.y, 0, y + h - MIN)
      h = y + h - next
      y = next
    } else if (handle.includes('s')) {
      h = clamp(p.y - y, MIN, 1 - y)
    }
    return { x, y, w, h }
  }

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    if (d.handle === 'move') {
      onChange({
        ...d.crop,
        x: clamp(d.crop.x + p.x - d.startX, 0, 1 - d.crop.w),
        y: clamp(d.crop.y + p.y - d.startY, 0, 1 - d.crop.h),
      })
    } else {
      onChange(resize(d.handle, d.crop, p))
    }
  }

  const visible = ratio ? HANDLES.filter((h) => h.length === 2) : HANDLES

  return (
    <div
      ref={box}
      className={styles.cropArea}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <div
        className={styles.cropRect}
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`,
          height: `${crop.h * 100}%`,
        }}
        onPointerDown={start('move')}
      >
        {visible.map((handle) => (
          <span
            key={handle}
            className={`${styles.handle} ${styles[`handle_${handle}`]}`}
            onPointerDown={start(handle)}
          />
        ))}
      </div>
    </div>
  )
}
