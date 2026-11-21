import { Button } from '../../../ui/Button'
import type { DrivePhoto } from '../../../interfaces'
import { FORMATS } from '../edit'
import styles from '../PhotoEditor.module.css'
import type { SaveForm } from '../useSaveForm'
import { Chips, Slider } from './controls'

export function SavePanel({
  photo,
  form,
  finalW,
  finalH,
}: {
  photo: DrivePhoto
  form: SaveForm
  finalW: number
  finalH: number
}) {
  const {
    mode,
    chooseMode,
    name,
    changeName,
    extension,
    format,
    setFormat,
    quality,
    setQuality,
    confirming,
    setConfirming,
    busy,
    message,
    finalName,
    run,
    trashConfirming,
    setTrashConfirming,
    moveToTrash,
  } = form

  return (
    <>
      <Chips
        label="Save as"
        value={mode}
        onChange={chooseMode}
        options={[
          ['copy', 'Save as new file'],
          ['overwrite', 'Overwrite original'],
          ['rename', 'Rename only'],
        ]}
      />
      <label className={styles.field}>
        File name
        <span className={styles.nameRow}>
          <input
            type="text"
            value={name}
            onChange={(e) => changeName(e.target.value)}
          />
          <span>.{extension}</span>
        </span>
      </label>
      {mode !== 'rename' && (
        <>
          <Chips
            label="Format"
            value={format.type}
            onChange={(type) =>
              setFormat(FORMATS.find((f) => f.type === type)!)
            }
            options={FORMATS.map((f) => [f.type, f.label])}
          />
          {format.type !== 'image/png' && (
            <Slider
              label="Quality"
              value={quality}
              min={40}
              max={100}
              suffix="%"
              onChange={setQuality}
            />
          )}
          <p className={styles.hint}>
            Result: {finalW} × {finalH}px
          </p>
        </>
      )}
      {mode === 'copy' && (
        <p className={styles.hint}>
          The original stays untouched; the copy keeps its tags and goes in the
          same folder.
        </p>
      )}
      {mode === 'overwrite' && (
        <p className={styles.warning}>
          This replaces the photo in your Drive with the edited version. Drive
          keeps the previous version for a while in the file's version history.
        </p>
      )}
      {confirming ? (
        <div className={styles.row}>
          <Button disabled={busy} onClick={run}>
            {busy ? 'Saving…' : 'Yes, overwrite'}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          disabled={
            busy ||
            !finalName ||
            (mode === 'rename' && finalName === photo.name)
          }
          onClick={() => (mode === 'overwrite' ? setConfirming(true) : run())}
        >
          {busy
            ? 'Saving…'
            : mode === 'copy'
              ? 'Save new file'
              : mode === 'overwrite'
                ? 'Overwrite original…'
                : 'Rename'}
        </Button>
      )}
      {message && (
        <p
          className={message.error ? styles.error : styles.success}
          role={message.error ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
      <div className={styles.dangerZone}>
        {trashConfirming ? (
          <>
            <p className={styles.warning}>
              Move "{photo.name}" to the Drive trash? Your edits will be
              discarded. You can restore the photo from the trash in Google
              Drive.
            </p>
            <div className={styles.row}>
              <Button
                className={styles.danger}
                disabled={busy}
                onClick={moveToTrash}
              >
                {busy ? 'Moving…' : 'Yes, move to trash'}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setTrashConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            className={styles.dangerOutline}
            disabled={busy}
            onClick={() => setTrashConfirming(true)}
          >
            Move to trash…
          </Button>
        )}
      </div>
    </>
  )
}
