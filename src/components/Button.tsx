import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export function Button({
  className,
  type = 'button',
  variant = 'solid',
  rounded = false,
  small = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline'
  rounded?: boolean
  small?: boolean
}) {
  const classes = [
    styles.button,
    variant === 'outline' && styles.outline,
    rounded && styles.rounded,
    small && styles.small,
    className,
  ]
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(' ')}
      {...props}
    />
  )
}
