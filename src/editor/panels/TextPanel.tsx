import { Button } from '../../components/Button'
import type { Overlay } from '../../interfaces'
import styles from '../PhotoEditor.module.css'
import { Chips, Slider } from './controls'

const STICKERS = [
  '😀',
  '😍',
  '😎',
  '🥳',
  '🔥',
  '❤️',
  '✨',
  '🎉',
  '🌈',
  '⭐',
  '💯',
  '👑',
  '🐶',
  '🐱',
  '🌸',
  '☀️',
]

export function TextPanel({
  overlays,
  selected,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
}: {
  overlays: Overlay[]
  selected: number | null
  onSelect: (id: number) => void
  onAdd: (kind: Overlay['kind'], text: string) => void
  onUpdate: (id: number, changes: Partial<Overlay>) => void
  onRemove: (id: number) => void
}) {
  const selectedOverlay = overlays.find((o) => o.id === selected)

  return (
    <>
      <div className={styles.row}>
        <Button small onClick={() => onAdd('text', 'Your text')}>
          + Add text
        </Button>
      </div>
      <h3>Stickers</h3>
      <div className={styles.stickers}>
        {STICKERS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Add ${emoji} sticker`}
            onClick={() => onAdd('emoji', emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {overlays.length > 0 && (
        <>
          <h3>On the photo</h3>
          <ul className={styles.overlayList}>
            {overlays.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={selected === o.id}
                  className={
                    selected === o.id ? styles.chipActive : styles.chip
                  }
                  onClick={() => onSelect(o.id)}
                >
                  {o.text.trim().split('\n')[0] || '(empty)'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {selectedOverlay ? (
        <div className={styles.group}>
          {selectedOverlay.kind === 'text' && (
            <>
              <textarea
                aria-label="Text"
                rows={2}
                value={selectedOverlay.text}
                onChange={(e) =>
                  onUpdate(selectedOverlay.id, { text: e.target.value })
                }
              />
              <Chips
                label="Text style"
                value={selectedOverlay.style}
                onChange={(style) => onUpdate(selectedOverlay.id, { style })}
                options={[
                  ['plain', 'Plain'],
                  ['outline', 'Outline'],
                  ['band', 'Banner'],
                ]}
              />
              <label className={styles.inline}>
                Colour
                <input
                  type="color"
                  value={selectedOverlay.color}
                  onChange={(e) =>
                    onUpdate(selectedOverlay.id, { color: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <Slider
            label="Size"
            value={Math.round(selectedOverlay.size * 100)}
            min={3}
            max={60}
            onChange={(v) => onUpdate(selectedOverlay.id, { size: v / 100 })}
          />
          <p className={styles.hint}>Click or drag on the photo to move it.</p>
          <Button
            variant="outline"
            small
            onClick={() => onRemove(selectedOverlay.id)}
          >
            Delete
          </Button>
        </div>
      ) : (
        overlays.length > 0 && (
          <p className={styles.hint}>Pick an item to edit it.</p>
        )
      )}
    </>
  )
}
