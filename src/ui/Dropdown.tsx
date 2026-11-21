import type { SelectHTMLAttributes } from 'react'
import styles from './Dropdown.module.css'

export interface DropdownOption<T extends string> {
  value: T
  label: string
}

export function Dropdown<T extends string>({
  className,
  options,
  value,
  onValueChange,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  options: readonly DropdownOption<T>[]
  value: T
  onValueChange: (value: T) => void
}) {
  return (
    <select
      className={[styles.dropdown, className].filter(Boolean).join(' ')}
      value={value}
      onChange={(event) => onValueChange(event.target.value as T)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
