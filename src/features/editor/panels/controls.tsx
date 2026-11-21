import type { ReactNode } from 'react'
import styles from '../PhotoEditor.module.css'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className={styles.slider}>
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [T, ReactNode][]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map(([id, content]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={value === id ? styles.chipActive : styles.chip}
          onClick={() => onChange(id)}
        >
          {content}
        </button>
      ))}
    </div>
  )
}
