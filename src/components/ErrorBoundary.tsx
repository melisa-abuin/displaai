import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reloadApp } from '../queryClient.ts'
import { Button } from './Button'
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

  reloadPage = () => reloadApp()

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
              href="https://displaai.mkdir.no/"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . Consider removing sensitive info before sharing.
          </p>
          <div className={styles.actions}>
            <Button onClick={this.toggleDetails}>
              {showDetails ? 'Hide details' : 'Show error'}
            </Button>
            <Button onClick={this.reloadPage}>Clear &amp; refresh</Button>
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
