import { useRef, useState } from 'react'
import { tagProperties } from '../../../drive/api'
import {
  useRenamePhoto,
  useSaveEditedPhoto,
  useTrashPhoto,
} from '../../../drive/hooks'
import type { DrivePhoto, EditState, IndexedPhoto } from '../../../interfaces'
import { applyFaces, canvasToBlob, fileStem, renderEdit } from '../utils/edit'
import { FORMATS } from '../constants'

export type SaveMode = 'copy' | 'overwrite' | 'rename'

/** The folder the photo sits in, from the local index. */
function indexedParent(photo: DrivePhoto): string | undefined {
  return (photo as Partial<IndexedPhoto>).parents?.[0]
}

/** State and actions for saving, renaming or trashing the edited photo. */
export function useSaveForm({
  token,
  photo,
  source,
  state,
  regions,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  source: HTMLCanvasElement
  state: EditState
  regions: Parameters<typeof applyFaces>[1] | undefined
  onClose: () => void
}) {
  const stem = fileStem(photo.name)
  const [mode, setMode] = useState<SaveMode>('copy')
  const [name, setName] = useState(`${stem}-edited`)
  const nameTouched = useRef(false)
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(FORMATS[0])
  const [quality, setQuality] = useState(92)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const [trashConfirming, setTrashConfirming] = useState(false)
  const save = useSaveEditedPhoto(token)
  const rename = useRenamePhoto(token)
  const trash = useTrashPhoto(token)
  const originalExt = photo.name.match(/\.([^./\\]+)$/)?.[1]

  const chooseMode = (next: SaveMode) => {
    setMode(next)
    setConfirming(false)
    setMessage(undefined)
    if (!nameTouched.current) setName(next === 'copy' ? `${stem}-edited` : stem)
  }

  const changeName = (value: string) => {
    nameTouched.current = true
    setName(value)
  }

  const extension = mode === 'rename' ? (originalExt ?? 'jpg') : format.ext
  const cleanName = name.replace(/[\\/]/g, '').trim()
  const finalName = cleanName ? `${cleanName}.${extension}` : ''

  const run = async () => {
    if (!finalName) return
    setBusy(true)
    setMessage(undefined)
    try {
      if (mode === 'rename') {
        await rename.mutateAsync({ photoId: photo.id, name: finalName })
        setMessage({ error: false, text: `Renamed to ${finalName}` })
      } else {
        const withFaces = regions
          ? applyFaces(source, regions, state.faces, state.faceEmoji)
          : source
        const canvas = renderEdit(withFaces, state)
        const edited = await canvasToBlob(canvas, format.type, quality / 100)
        await save.mutateAsync({
          name: finalName,
          blob: edited,
          parentId: indexedParent(photo),
          appProperties: tagProperties(photo),
          replaceId: mode === 'overwrite' ? photo.id : undefined,
        })
        setMessage({
          error: false,
          text:
            mode === 'overwrite'
              ? 'Original replaced with the edited photo'
              : `Saved as ${finalName}`,
        })
      }
      setConfirming(false)
      setTimeout(onClose, 900)
    } catch (e) {
      setMessage({
        error: true,
        text: e instanceof Error ? e.message : 'Saving failed',
      })
      setBusy(false)
    }
  }

  const moveToTrash = async () => {
    setBusy(true)
    setMessage(undefined)
    try {
      await trash.mutateAsync(photo.id)
      setMessage({ error: false, text: 'Moved to the Drive trash' })
      setTrashConfirming(false)
      setTimeout(onClose, 900)
    } catch (e) {
      setMessage({
        error: true,
        text: e instanceof Error ? e.message : 'Could not move to the trash',
      })
      setBusy(false)
    }
  }

  return {
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
  }
}

export type SaveForm = ReturnType<typeof useSaveForm>
