import type { FaceMode } from '../../../interfaces'
import styles from '../PhotoEditor.module.css'
import { Chips } from './controls'
import type { PanelProps } from './types'

const FACE_EMOJI = ['😎', '🥸', '🤡', '😺', '🐵', '👽', '🤖', '🙈']

export function FacesPanel({
  state,
  patch,
  faces,
}: PanelProps & {
  faces: { data?: { faces: unknown[] }; error: Error | null }
}) {
  return (
    <>
      <p className={styles.hint}>
        Faces are found on your device; nothing is uploaded.
      </p>
      <Chips<FaceMode>
        label="Face effect"
        value={state.faces}
        onChange={(mode) => patch({ faces: mode })}
        options={[
          ['none', 'Off'],
          ['blur', 'Blur'],
          ['pixelate', 'Pixelate'],
          ['emoji', 'Emoji'],
        ]}
      />
      {state.faces === 'emoji' && (
        <div className={styles.stickers}>
          {FACE_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={state.faceEmoji === emoji}
              aria-label={`Use ${emoji}`}
              className={state.faceEmoji === emoji ? styles.stickerActive : ''}
              onClick={() => patch({ faceEmoji: emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {state.faces !== 'none' && (
        <p className={styles.hint} role="status">
          {faces.error
            ? `Face detection failed: ${faces.error.message}`
            : !faces.data
              ? 'Detecting faces…'
              : `${faces.data.faces.length} ${faces.data.faces.length === 1 ? 'face' : 'faces'} found`}
        </p>
      )}
    </>
  )
}
