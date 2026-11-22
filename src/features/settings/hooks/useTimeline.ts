import { useCallback, useSyncExternalStore } from 'react'
import { TIMELINE_KEY } from '../constants'
import { read, subscribe, write } from '../utils/storage'

/** Whether the gallery's time scrubber is shown, persisted locally. On by default. */
export function useTimeline() {
  const visible =
    useSyncExternalStore(subscribe, () => read(TIMELINE_KEY)) !== 'false'
  const setVisible = useCallback(
    (value: boolean) => write(TIMELINE_KEY, String(value)),
    [],
  )
  return [visible, setVisible] as const
}
