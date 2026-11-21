import { useRef, type RefObject } from 'react'
import type { Crop, Overlay } from '../../interfaces'
import { CropBox } from './CropBox'
import styles from './PhotoEditor.module.css'

/** The live preview canvas plus the crop box and text-placement layers. */
export function EditorStage({
  canvasRef,
  aspect,
  cropping,
  crop,
  lockedRatio,
  imageAspect,
  onCropChange,
  placing,
  marker,
  onPlace,
  faceBusy,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  aspect: number
  cropping: boolean
  crop: Crop
  lockedRatio: number | null
  imageAspect: number
  onCropChange: (crop: Crop) => void
  placing: boolean
  marker?: Pick<Overlay, 'x' | 'y'>
  onPlace: (x: number, y: number) => void
  faceBusy: boolean
}) {
  const dragging = useRef(false)
  const place = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace(
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    )
  }

  return (
    <div className={styles.stage}>
      <div className={styles.stageInner}>
        <div
          className={styles.canvasWrap}
          style={{
            width: `min(100cqw, calc(100cqh * ${aspect}))`,
            aspectRatio: String(aspect),
          }}
        >
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-label="Edited preview"
          />
          {cropping && (
            <CropBox
              crop={crop}
              ratio={lockedRatio}
              imageAspect={imageAspect}
              onChange={onCropChange}
            />
          )}
          {placing && (
            <div
              className={styles.placeLayer}
              onPointerDown={(e) => {
                dragging.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                place(e)
              }}
              onPointerMove={(e) => dragging.current && place(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            >
              {marker && (
                <span
                  className={styles.marker}
                  style={{
                    left: `${marker.x * 100}%`,
                    top: `${marker.y * 100}%`,
                  }}
                />
              )}
            </div>
          )}
        </div>
        {faceBusy && (
          <div className={styles.toast} role="status">
            Detecting faces…
          </div>
        )}
      </div>
    </div>
  )
}
