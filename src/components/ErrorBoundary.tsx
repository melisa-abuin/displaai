import { Component, type ErrorInfo, type ReactNode } from 'react'
import { persister, queryClient } from '../queryClient.ts'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  toggleDetails = () => {
    this.setState(({ showDetails }) => ({ showDetails: !showDetails }))
  }

  reloadPage = async () => {
    queryClient.clear()
    await persister.removeClient()

    if (navigator.onLine) {
      await Promise.all(
        ((await navigator.serviceWorker?.getRegistrations()) || []).map((r) =>
          r.unregister(),
        ),
      )
      await Promise.all(
        ((await window.caches?.keys()) || []).map((c) =>
          window.caches.delete(c),
        ),
      )
    }

    window.location.reload()
  }

  render() {
    const { hasError, error, showDetails } = this.state

    if (!hasError) return this.props.children

    return (
      <div className={styles.page} role="alert">
        <div className={styles.card}>
          <div className={styles.icon} aria-hidden="true">
            !
          </div>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.description}>
            Try clearing the cache and refreshing. If that fails, reveal the
            error details below and report them on{' '}
            <a
              href="https://github.com/melisa-abuin/drive-photos-displayer/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . Consider removing sensitive info before sharing.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={this.toggleDetails}
            >
              {showDetails ? 'Hide details' : 'Show error'}
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={this.reloadPage}
            >
              Clear &amp; refresh
            </button>
          </div>
          {showDetails && error && (
            <pre className={styles.details}>
              {error.stack || error.toString()}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
