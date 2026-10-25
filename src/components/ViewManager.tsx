import { useMemo, useState } from 'react'
import type { TagCount } from '../drive/api'
import type { DriveFolder } from '../drive/api'
import { cycleTag, tagState, type TagFilter } from '../drive/tagFilter'
import { newViewId, type CustomView } from '../drive/views'
import { Button } from './Button'
import styles from './ViewManager.module.css'

export const NEW_VIEW = 'new'

/** A folder enabled in Manage folders; depth is its nesting below the connected folder. */
export interface ViewFolderOption {
  folder: DriveFolder
  depth: number
}

interface ViewManagerProps {
  views: readonly CustomView[]
  /** The view being edited, `NEW_VIEW` for a new one, or undefined for the list. */
  editingId: string | undefined
  /** Only the folders enabled in Manage folders, in display order. */
  folders: readonly ViewFolderOption[] | undefined
  tags: TagCount[] | undefined
  onEdit: (id: string | undefined) => void
  onSave: (view: CustomView) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}

function ViewForm({
  initial,
  options,
  tags,
  onSave,
  onCancel,
}: {
  initial: CustomView
  options: readonly ViewFolderOption[] | undefined
  tags: TagCount[] | undefined
  onSave: (view: CustomView) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const byId = useMemo(
    () => new Map((options ?? []).map(({ folder }) => [folder.id, folder])),
    [options],
  )
  // Folders that were disabled since the view was saved are dropped.
  const [folderIds, setFolderIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        initial.folders
          .map((f) => f.id)
          .filter((id) => !options || byId.has(id)),
      ),
  )
  const [filter, setFilter] = useState<TagFilter>({
    tags: initial.tags,
    exclude: initial.exclude,
    match: initial.match,
  })
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return needle
      ? (options ?? []).filter(({ folder }) =>
          folder.path.toLowerCase().includes(needle),
        )
      : (options ?? [])
  }, [options, search])

  // A ticked folder covers everything inside it, so ticked descendants are redundant.
  const coveredBy = (id: string) => {
    const seen = new Set<string>()
    let parentId = byId.get(id)?.parentId
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      if (folderIds.has(parentId)) return byId.get(parentId)
      parentId = byId.get(parentId)?.parentId
    }
    return undefined
  }

  const toggleFolder = (id: string) => {
    const next = new Set(folderIds)
    if (!next.delete(id)) next.add(id)
    setFolderIds(next)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const folders = [...folderIds]
      .filter((id) => !coveredBy(id))
      .map((id) => ({ id, recursive: true }))
    onSave({
      ...initial,
      name: name.trim(),
      folders,
      tags: [...filter.tags],
      exclude: [...filter.exclude],
      match: filter.match,
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Holidays without screenshots"
          required
          autoFocus
        />
      </label>

      <fieldset className={styles.group}>
        <legend>Folders</legend>
        <p className={styles.hint}>
          Pick from the folders enabled in Manage folders. Ticking a folder
          includes everything inside it. Leave all unticked to use every enabled
          folder.
        </p>
        <input
          type="search"
          aria-label="Search folders"
          placeholder="Search folders"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className={styles.folders}>
          {shown.map(({ folder, depth }) => {
            const parent = coveredBy(folder.id)
            return (
              <li
                key={folder.id}
                style={{ paddingLeft: `${search ? 0 : depth * 16}px` }}
              >
                <label title={folder.path}>
                  <input
                    type="checkbox"
                    checked={folderIds.has(folder.id) || !!parent}
                    disabled={!!parent}
                    onChange={() => toggleFolder(folder.id)}
                  />
                  <span>{search ? folder.path : folder.name}</span>
                </label>
              </li>
            )
          })}
          {options && shown.length === 0 && (
            <li>{search ? 'No folders found.' : 'No folders enabled yet.'}</li>
          )}
        </ul>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Tags</legend>
        <p className={styles.hint}>
          Click a tag once to include it, twice to exclude it, three times to
          clear it.
        </p>
        {filter.tags.length > 1 && (
          <div className={styles.match} role="group" aria-label="Match">
            {(['any', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter.match === value}
                onClick={() => setFilter({ ...filter, match: value })}
              >
                {value === 'any' ? 'Any included tag' : 'All included tags'}
              </button>
            ))}
          </div>
        )}
        <div className={styles.tags}>
          {(tags ?? []).map((tag) => {
            const state = tagState(filter, tag.name)
            return (
              <button
                key={tag.name}
                type="button"
                className={styles.tag}
                data-state={state}
                aria-pressed={state !== 'off'}
                onClick={() => setFilter(cycleTag(filter, tag.name))}
              >
                {state === 'exclude' ? 'Not ' : ''}
                {tag.name}
              </button>
            )
          })}
          {tags?.length === 0 && <span>No tags yet.</span>}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" disabled={!name.trim()}>
          Save view
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function ViewManager({
  views,
  editingId,
  folders,
  tags,
  onEdit,
  onSave,
  onRemove,
  onOpen,
}: ViewManagerProps) {
  if (editingId !== undefined) {
    const existing = views.find((v) => v.id === editingId)
    if (editingId !== NEW_VIEW && !existing) {
      return (
        <div className={styles.manager}>
          <p>This view no longer exists.</p>
          <Button variant="outline" onClick={() => onEdit(undefined)}>
            Back to views
          </Button>
        </div>
      )
    }
    return (
      <div className={styles.manager}>
        <ViewForm
          key={editingId}
          initial={
            existing ?? {
              id: newViewId(),
              name: '',
              folders: [],
              tags: [],
              exclude: [],
              match: 'any',
            }
          }
          options={folders}
          tags={tags}
          onSave={onSave}
          onCancel={() => onEdit(undefined)}
        />
      </div>
    )
  }

  return (
    <div className={styles.manager}>
      <p className={styles.hint}>
        Views are saved galleries in the sidebar. Each one combines folders with
        tags to include or exclude.
      </p>
      {views.length === 0 && <p>No views yet.</p>}
      <ul className={styles.list}>
        {views.map((view) => (
          <li key={view.id} className={styles.row}>
            <button
              type="button"
              className={styles.link}
              onClick={() => onOpen(view.id)}
            >
              {view.name}
            </button>
            <span className={styles.summary}>
              {view.folders.length || 'All'} folders &middot; {view.tags.length}{' '}
              tags &middot; {view.exclude.length} excluded
            </span>
            <Button small variant="outline" onClick={() => onEdit(view.id)}>
              Edit
            </Button>
            <Button
              small
              variant="outline"
              aria-label={`Delete ${view.name}`}
              onClick={() => onRemove(view.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button onClick={() => onEdit(NEW_VIEW)}>New view</Button>
      </div>
    </div>
  )
}
