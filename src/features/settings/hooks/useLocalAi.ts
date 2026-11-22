import { useCallback, useSyncExternalStore } from 'react'
import { LOCAL_AI_KEY } from '../constants'
import { read, subscribe, write } from '../utils/storage'

/** Whether the on-device AI scanning features are turned on, persisted locally. Off by default. */
export function useLocalAi() {
  const enabled =
    useSyncExternalStore(subscribe, () => read(LOCAL_AI_KEY)) === 'true'
  const setEnabled = useCallback(
    (value: boolean) => write(LOCAL_AI_KEY, String(value)),
    [],
  )
  return [enabled, setEnabled] as const
}
