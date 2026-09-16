import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import styles from './App.module.css'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

async function fetchGreeting(): Promise<string> {
  return 'Hello from TanStack Query!'
}

function App() {
  const [count, setCount] = useState(0)
  const { data: greeting, isLoading } = useQuery({
    queryKey: ['greeting'],
    queryFn: fetchGreeting,
  })

  return (
    <main className={styles.app}>
      <div className={styles.logos}>
        <img src={viteLogo} className={styles.logo} alt="Vite logo" />
        <img src={reactLogo} className={styles.logoReact} alt="React logo" />
      </div>
      <h1>drive-photos-displayer</h1>
      <div className={styles.card}>
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          Count is {count}
        </button>
        <p>{isLoading ? 'Loading…' : greeting}</p>
      </div>
    </main>
  )
}

export default App
