import { Switch } from '../../../ui/Switch'
import styles from '../Settings.module.css'

interface ToggleRowProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: ToggleRowProps) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  )
}
