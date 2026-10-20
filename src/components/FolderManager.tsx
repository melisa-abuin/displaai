import { useMemo } from 'react'
import type { DriveFolder } from '../drive/api'
import type { ConnectedFolder } from '../drive/connectedFolders'
import { folderChain, type FolderIndex } from '../drive/folderTree'
import { formatNumber } from '../format'
import styles from './FolderManager.module.css'

interface FolderManagerProps {
  index: FolderIndex | undefined
  /** The folder whose children are listed; null is the top level. */
  currentId: string | null
  /** Called with the folder ids leading to the folder to open (empty for the top level). */
  onNavigate: (folderIds: string[]) => void
  isLoading: boolean
  error: Error | null
  entries: readonly ConnectedFolder[]
  onSetFolder: (id: string, recursive: boolean | null) => void
  onClear: () => void
  onDone: () => void
}

export function FolderManager({
  index,
  currentId,
  onNavigate,
  isLoading,
  error,
  entries,
  onSetFolder,
  onClear,
  onDone,
}: FolderManagerProps) {
  const byFolder = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  )

  const chain = useMemo(
    () => (index && currentId ? folderChain(index, currentId) : []),
    [index, currentId],
  )
  const current = chain.at(-1)
  const shown = index?.children.get(current ? current.id : null) ?? []

  const trail: { folder: DriveFolder | null; name: string }[] = [
    { folder: null, name: 'My Drive' },
    ...chain.map((folder) => ({ folder, name: folder.name })),
  ]

  const open = (folder: DriveFolder | null) =>
    onNavigate(
      folder && index ? folderChain(index, folder.id).map((f) => f.id) : [],
    )

  /** The nearest ancestor that already includes its subfolders, if any. */
  const coveredBy = (id: string) => {
    if (!index) return undefined
    const seen = new Set<string>()
    let parentId = index.byId.get(id)?.parentId
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      if (byFolder.get(parentId)?.recursive) return index.byId.get(parentId)
      parentId = index.byId.get(parentId)?.parentId
    }
    return undefined
  }

  return (
    <div className={styles.manager}>
      <p className={styles.intro}>
        Choose which Drive folders appear in the app. Open a folder to pick from
        its subfolders, or tick &ldquo;Include subfolders&rdquo; to add
        everything inside it.
      </p>
      <div className={styles.toolbar}>
        <button type="button" disabled={entries.length === 0} onClick={onClear}>
          Disconnect all
        </button>
        <span className={styles.summary}>{entries.length} connected</span>
        <button
          type="button"
          className={styles.done}
          disabled={entries.length === 0}
          onClick={onDone}
        >
          Done
        </button>
      </div>

      <nav aria-label="Folder path" className={styles.breadcrumbs}>
        {trail.map((crumb, i) => (
          <span key={crumb.folder?.id ?? 'root'}>
            {i > 0 && <span aria-hidden="true"> / </span>}
            {i === trail.length - 1 ? (
              <span aria-current="location">{crumb.name}</span>
            ) : (
              <button
                type="button"
                className={styles.crumb}
                onClick={() => open(crumb.folder)}
              >
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {isLoading && <p className={styles.status}>Loading folders&hellip;</p>}
      {error && (
        <p role="alert" className={styles.status}>
          Could not load folders.
        </p>
      )}
      {index && shown.length === 0 && (
        <p className={styles.status}>No folders with photos here.</p>
      )}
      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((folder) => {
            const entry = byFolder.get(folder.id)
            const parent = coveredBy(folder.id)
            const subfolders = index?.children.get(folder.id) ?? []
            return (
              <li key={folder.id} className={styles.row}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={!!entry || !!parent}
                    disabled={!!parent}
                    onChange={(e) =>
                      onSetFolder(folder.id, e.target.checked ? false : null)
                    }
                  />
                  <span>Add</span>
                </label>
                {subfolders.length > 0 ? (
                  <button
                    type="button"
                    className={styles.open}
                    title={folder.path}
                    onClick={() => open(folder)}
                  >
                    <span className={styles.name}>{folder.name}</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </button>
                ) : (
                  <span className={styles.open} title={folder.path}>
                    <span className={styles.name}>{folder.name}</span>
                  </span>
                )}
                {parent && (
                  <span className={styles.via}>via {parent.name}</span>
                )}
                <span className={styles.count}>
                  {formatNumber(
                    subfolders.length > 0
                      ? folder.totalCount
                      : folder.photoCount,
                  )}
                </span>
                {subfolders.length > 0 && (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={!!entry?.recursive || !!parent}
                      disabled={!entry || !!parent}
                      onChange={(e) => onSetFolder(folder.id, e.target.checked)}
                    />
                    <span>Include subfolders</span>
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
