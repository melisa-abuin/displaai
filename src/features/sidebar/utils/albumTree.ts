import type { SidebarAlbum } from '../../../interfaces'

/** The ids of the folders containing `id`, from the nearest outwards. */
export function ancestorIds(albums: SidebarAlbum[], id: string): string[] {
  const index = albums.findIndex((album) => album.folder.id === id)
  if (index < 0) return []
  const ids: string[] = []
  let depth = albums[index].depth
  for (let i = index - 1; i >= 0 && depth > 0; i--) {
    if (albums[i].depth < depth) {
      depth = albums[i].depth
      ids.push(albums[i].folder.id)
    }
  }
  return ids
}

/** The albums not hidden inside a collapsed folder. */
export function visibleAlbums(
  albums: SidebarAlbum[],
  expanded: ReadonlySet<string>,
) {
  const result: { album: SidebarAlbum; hasChildren: boolean }[] = []
  let hiddenBelow = Infinity
  albums.forEach((album, i) => {
    if (album.depth > hiddenBelow) return
    hiddenBelow = Infinity
    const hasChildren = (albums[i + 1]?.depth ?? 0) > album.depth
    result.push({ album, hasChildren })
    if (hasChildren && !expanded.has(album.folder.id)) hiddenBelow = album.depth
  })
  return result
}
