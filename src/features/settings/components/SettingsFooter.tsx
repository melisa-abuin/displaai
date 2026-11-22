import { reloadApp } from '../../../queryClient'
import { Button } from '../../../ui/Button'
import styles from '../Settings.module.css'

export function SettingsFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className={styles.footer}>
      <Button onClick={onSignOut}>Log out</Button>
      {import.meta.env.DEV && (
        <Button
          onClick={reloadApp}
          title="Reloading can help with issues like outdated cache or version conflicts."
        >
          Reload App
        </Button>
      )}
    </div>
  )
}
