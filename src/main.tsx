import '@fontsource-variable/inter'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import { persister, queryClient } from './queryClient.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {__NPM_LIFECYCLE_EVENT__ === 'dev:nocache' ? (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      ) : (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                query.state.status === 'success' &&
                query.meta?.persist !== false,
            },
          }}
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </PersistQueryClientProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
