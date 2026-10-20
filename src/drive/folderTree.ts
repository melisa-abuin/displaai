import type { DriveFolder } from './api'

export interface FolderIndex {
  byId: Map<string, DriveFolder>
  /** Non-empty folders grouped by parent; top-level folders are under `null`. */
  children: Map<string | null, DriveFolder[]>
}

/** Indexes folders, leaving out those without photos anywhere inside them. */
export function buildFolderIndex(folders: DriveFolder[]): FolderIndex {
  const visible = folders.filter((folder) => folder.totalCount > 0)
  const byId = new Map(visible.map((folder) => [folder.id, folder]))
  const children = new Map<string | null, DriveFolder[]>()
  for (const folder of visible) {
    const parent =
      folder.parentId &&
      folder.parentId !== folder.id &&
      byId.has(folder.parentId)
        ? folder.parentId
        : null
    const siblings = children.get(parent)
    if (siblings) siblings.push(folder)
    else children.set(parent, [folder])
  }
  return { byId, children }
}

/** The folders from the top level down to `id`, inclusive; empty if unknown. */
export function folderChain(index: FolderIndex, id: string): DriveFolder[] {
  const chain: DriveFolder[] = []
  const seen = new Set<string>()
  let folder = index.byId.get(id)
  while (folder && !seen.has(folder.id)) {
    seen.add(folder.id)
    chain.unshift(folder)
    folder = folder.parentId ? index.byId.get(folder.parentId) : undefined
  }
  return chain
}

export function descendantIds(index: FolderIndex, id: string): string[] {
  const ids: string[] = []
  const stack = [id]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (seen.has(current)) continue
    seen.add(current)
    ids.push(current)
    for (const child of index.children.get(current) ?? []) stack.push(child.id)
  }
  return ids
}
