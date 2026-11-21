import styles from '../PhotoEditor.module.css'
import { Slider } from './controls'
import type { PanelProps } from './types'

export function FiltersPanel({
  state,
  patch,
  thumbs,
}: PanelProps & { thumbs: { id: string; name: string; url: string }[] }) {
  return (
    <>
      <ul className={styles.filters} aria-label="Filters">
        {thumbs.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              aria-pressed={state.filter === f.id}
              className={
                state.filter === f.id ? styles.filterActive : styles.filter
              }
              onClick={() => patch({ filter: f.id })}
            >
              <img src={f.url} alt="" />
              <span>{f.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {state.filter !== 'none' && (
        <Slider
          label="Intensity"
          value={state.filterAmount}
          min={0}
          max={100}
          suffix="%"
          onChange={(filterAmount) => patch({ filterAmount })}
        />
      )}
    </>
  )
}
