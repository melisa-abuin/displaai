import type { InputHTMLAttributes } from 'react'
import styles from './Switch.module.css'

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <label className={`${styles.switch} ${className ?? ''}`}>
      <input
        type="checkbox"
        role="switch"
        className={styles.input}
        {...props}
      />
      <span className={styles.thumb} aria-hidden="true" />
    </label>
  )
}
