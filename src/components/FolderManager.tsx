import { useEffect, useMemo, useState } from 'react'
import type { DriveFolder } from '../drive/api'
import type { ConnectedFolder } from '../drive/connectedFolders'
import { folderChain, type FolderIndex } from '../drive/folderTree'
import { formatNumber } from '../format'
import { Button } from './Button'
import styles from './FolderManager.module.css'
import { Switch } from './Switch'

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
  /** Opens a read-only gallery of the folder's photos, subfolders included. */
  onPeek: (folderId: string) => void
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
  onPeek,
  onClear,
  onDone,
}: FolderManagerProps) {
  // The folder whose options drawer is open (small screens only).
  const [optionsId, setOptionsId] = useState<string | null>(null)
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

  useEffect(() => {
    if (optionsId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setOptionsId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [optionsId])

  const importSwitch = (folder: DriveFolder) => {
    const parent = coveredBy(folder.id)
    return (
      <Switch
        aria-label={`Import ${folder.name}`}
        checked={byFolder.has(folder.id) || !!parent}
        disabled={!!parent}
        onChange={(e) =>
          onSetFolder(folder.id, e.target.checked ? false : null)
        }
      />
    )
  }

  const subfoldersSwitch = (folder: DriveFolder, className?: string) => {
    const entry = byFolder.get(folder.id)
    const parent = coveredBy(folder.id)
    return (
      <Switch
        className={className}
        aria-label={`Include subfolders of ${folder.name}`}
        checked={!!entry?.recursive || !!parent}
        disabled={!entry || !!parent}
        onChange={(e) => onSetFolder(folder.id, e.target.checked)}
      />
    )
  }

  const hasSubfolders = (folder: DriveFolder) =>
    (index?.children.get(folder.id)?.length ?? 0) > 0
  const sourceOf = (folder: DriveFolder) =>
    folder.ownedByMe ? 'Own drive' : 'Shared with me'

  const optionsFolder =
    optionsId === null ? undefined : index?.byId.get(optionsId)
  const optionsParent = optionsFolder && coveredBy(optionsFolder.id)

  return (
    <div className={styles.manager}>
      <p className={styles.intro}>
        Choose which Drive folders appear in the app. Open a folder to pick from
        its subfolders, or tick &ldquo;Include subfolders&rdquo; to add
        everything inside it.
      </p>
      {trail.length > 1 && (
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
      )}

      {isLoading && (
        <div className={styles.status} role="status">
          <div className={styles.loader}>
            <img src={`${import.meta.env.BASE_URL}loader.gif`} alt="" />
            <p>Loading folders&hellip;</p>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.status}>
          Could not load folders.
        </p>
      )}
      {index && shown.length === 0 && (
        <p className={styles.status}>No folders with photos here.</p>
      )}
      {shown.length > 0 && (
        <div className={styles.listHeader} aria-hidden="true">
          <span>Folder name</span>
          <span>Source</span>
          <span>Import folder</span>
          <span>Include subfolders</span>
          <span>Actions</span>
          <span className={styles.countHeader}>Pictures found</span>
        </div>
      )}
      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((folder) => {
            const parent = coveredBy(folder.id)
            const subfolders = index?.children.get(folder.id) ?? []
            const count =
              subfolders.length > 0 ? folder.totalCount : folder.photoCount
            return (
              <li key={folder.id} className={styles.row}>
                <div className={styles.nameCell}>
                  {subfolders.length > 0 ? (
                    <button
                      type="button"
                      className={styles.open}
                      title={folder.path}
                      onClick={() => open(folder)}
                    >
                      <span className={styles.name}>{folder.name}</span>
                      <span aria-hidden="true" className={styles.chevron}>
                        &rsaquo;
                      </span>
                    </button>
                  ) : (
                    <span className={styles.open} title={folder.path}>
                      <span className={styles.name}>{folder.name}</span>
                    </span>
                  )}
                  {parent && (
                    <span className={styles.via}>via {parent.name}</span>
                  )}
                  <span className={styles.meta}>
                    {sourceOf(folder)} &middot; {formatNumber(count)} photos
                    {parent && <> &middot; via {parent.name}</>}
                  </span>
                </div>
                <span className={`${styles.source} ${styles.wideOnly}`}>
                  {sourceOf(folder)}
                </span>
                {importSwitch(folder)}
                {subfolders.length > 0 ? (
                  subfoldersSwitch(folder, styles.wideOnly)
                ) : (
                  <span className={styles.wideOnly} />
                )}
                <Button
                  small
                  variant="outline"
                  className={styles.wideOnly}
                  aria-label={`Peek inside ${folder.name}`}
                  disabled={folder.totalCount === 0}
                  onClick={() => onPeek(folder.id)}
                >
                  <svg
                    className={styles.peekIcon}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </svg>
                  Peek
                </Button>
                <span className={`${styles.count} ${styles.wideOnly}`}>
                  {formatNumber(count)}
                </span>
                <button
                  type="button"
                  className={styles.more}
                  aria-label={`Options for ${folder.name}`}
                  aria-haspopup="dialog"
                  onClick={() => setOptionsId(folder.id)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.toolbar}>
        <Button
          small
          variant="outline"
          disabled={entries.length === 0}
          onClick={onClear}
        >
          Reset selection
        </Button>
        <span className={styles.summary}>{entries.length} selected</span>
        <Button
          small
          className={styles.done}
          disabled={entries.length === 0}
          onClick={onDone}
        >
          Done
        </Button>
      </div>

      {optionsFolder && (
        <>
          <div
            className={styles.sheetBackdrop}
            aria-hidden="true"
            onClick={() => setOptionsId(null)}
          />
          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={`Options for ${optionsFolder.name}`}
          >
            <span className={styles.handle} aria-hidden="true" />
            <h3 className={styles.sheetTitle}>{optionsFolder.name}</h3>
            <p className={styles.sheetMeta}>
              {sourceOf(optionsFolder)} &middot;{' '}
              {formatNumber(
                hasSubfolders(optionsFolder)
                  ? optionsFolder.totalCount
                  : optionsFolder.photoCount,
              )}{' '}
              photos
            </p>
            <div className={styles.option}>
              <span>
                Import folder
                {optionsParent && (
                  <span className={styles.optionNote}>
                    Included via {optionsParent.name}
                  </span>
                )}
              </span>
              {importSwitch(optionsFolder)}
            </div>
            {hasSubfolders(optionsFolder) && (
              <div className={styles.option}>
                <span>Include subfolders</span>
                {subfoldersSwitch(optionsFolder)}
              </div>
            )}
            <Button
              variant="outline"
              className={styles.sheetPeek}
              disabled={optionsFolder.totalCount === 0}
              onClick={() => {
                setOptionsId(null)
                onPeek(optionsFolder.id)
              }}
            >
              Peek inside
            </Button>
          </section>
        </>
      )}
    </div>
  )
}
