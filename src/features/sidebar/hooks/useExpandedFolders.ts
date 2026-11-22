import { useCallback, useState } from 'react'
import type { SidebarAlbum } from '../../../interfaces'
import { ancestorIds } from '../utils/albumTree'

/** Which folders are expanded; the parents of the selected folder always open so it is never hidden. */
export function useExpandedFolders(
  albums: SidebarAlbum[] | undefined,
  selectedId: string | null,
) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [revealedId, setRevealedId] = useState<string | null>(null)

  if (selectedId !== revealedId && albums) {
    setRevealedId(selectedId)
    if (selectedId !== null) {
      const parents = ancestorIds(albums, selectedId)
      if (parents.some((id) => !expanded.has(id)))
        setExpanded(new Set([...expanded, ...parents]))
    }
  }

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  return [expanded, toggle] as const
}
