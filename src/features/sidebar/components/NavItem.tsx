import { formatNumber } from '../../../lib/format'
import styles from '../Sidebar.module.css'

interface NavItemProps {
  label: string
  /** Hidden until known. */
  count: number | undefined
  title?: string
  isCurrent: boolean
  onClick: () => void
}

export function NavItem({
  label,
  count,
  title,
  isCurrent,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      className={styles.item}
      title={title}
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onClick}
    >
      <span className={styles.name}>{label}</span>
      {count !== undefined && (
        <>
          {' '}
          <span className={styles.count}>{formatNumber(count)}</span>
        </>
      )}
    </button>
  )
}
