import { useId, useState } from 'react'
import { normalizeTag, photoTags, type DrivePhoto } from '../drive/api'
import { useTags, useUpdateTags } from '../drive/hooks'
import styles from './TagEditor.module.css'

const MAX_SUGGESTIONS = 8

export function TagEditor({
  token,
  photo,
}: {
  token: string
  photo: DrivePhoto
}) {
  const tags = photoTags(photo)
  const { data: knownTags = [] } = useTags(token)
  const update = useUpdateTags(token)
  const listId = useId()
  const [draft, setDraft] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)

  const names = [...new Set([...knownTags.map((t) => t.name), ...tags])]
  // Reuse an existing tag's spelling so "Beach" and "beach" don't both appear.
  const canonical = (input: string) => {
    const tag = normalizeTag(input)
    return (
      tag && (names.find((n) => n.toLowerCase() === tag.toLowerCase()) ?? tag)
    )
  }

  const save = (add: string[], remove: string[]) => {
    const toAdd = [...new Set(add)].filter((tag) => !tags.includes(tag))
    const toRemove = remove.filter(
      (tag) => tags.includes(tag) && !add.includes(tag),
    )
    if (toAdd.length || toRemove.length) {
      update.mutate({ photoId: photo.id, add: toAdd, remove: toRemove })
    }
  }

  const query = draft.trim().toLowerCase()
  const suggestions = knownTags
    .filter(
      (tag) =>
        !tags.includes(tag.name) && tag.name.toLowerCase().includes(query),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SUGGESTIONS)
    .map((tag) => ({ name: tag.name, isNew: false }))
  const typed = draft.trim() ? canonical(draft) : undefined
  if (typed && !tags.includes(typed) && !names.includes(typed)) {
    suggestions.push({ name: typed, isNew: true })
  }
  const activeIndex = Math.min(active, suggestions.length - 1)
  const tooLong = Boolean(draft.trim()) && !typed

  const add = (name: string) => {
    save([name], [])
    setDraft('')
    setActive(0)
  }

  return (
    <div className={styles.editor}>
      <ul className={styles.tags} aria-label="Tags">
        {tags.map((tag) => (
          <li key={tag} className={styles.tag}>
            {editing === tag ? (
              <input
                autoFocus
                className={styles.editInput}
                aria-label={`Rename tag ${tag}`}
                defaultValue={tag}
                maxLength={60}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditing(null)
                  } else if (e.key === 'Enter') {
                    const renamed = canonical(e.currentTarget.value)
                    if (renamed && renamed !== tag) save([renamed], [tag])
                    setEditing(null)
                  }
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  className={styles.tagName}
                  title="Rename tag"
                  disabled={update.isPending}
                  onClick={() => setEditing(tag)}
                >
                  {tag}
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove tag ${tag}`}
                  disabled={update.isPending}
                  onClick={() => save([], [tag])}
                >
                  &times;
                </button>
              </>
            )}
          </li>
        ))}
        {tags.length === 0 && <li className={styles.empty}>No tags yet</li>}
      </ul>

      <div className={styles.combo}>
        <input
          className={styles.input}
          role="combobox"
          aria-label="Add a tag"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          placeholder="Add a tag…"
          maxLength={60}
          value={draft}
          disabled={update.isPending}
          onChange={(e) => {
            setDraft(e.target.value)
            setActive(0)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setIsOpen(true)
              const step = e.key === 'ArrowDown' ? 1 : -1
              const count = suggestions.length
              if (count) setActive((activeIndex + step + count) % count)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const choice = suggestions[activeIndex]
              if (isOpen && choice) add(choice.name)
              else if (typed) add(typed)
            } else if (e.key === 'Escape' && (isOpen || draft)) {
              e.preventDefault()
              setIsOpen(false)
              setDraft('')
            }
          }}
        />
        {isOpen && suggestions.length > 0 && (
          <ul id={listId} role="listbox" className={styles.suggestions}>
            {suggestions.map((suggestion, i) => (
              <li
                key={suggestion.name}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? styles.activeOption : undefined}
                // Keeps focus in the input so its blur doesn't close the list first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(suggestion.name)}
              >
                {suggestion.isNew
                  ? `Create “${suggestion.name}”`
                  : suggestion.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {tooLong && <p className={styles.hint}>That tag is too long.</p>}
      {update.isError && (
        <p role="alert" className={styles.hint}>
          Could not save tags. If this keeps happening, sign out and back in to
          grant access.
        </p>
      )}
    </div>
  )
}
