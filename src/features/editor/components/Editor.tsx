import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../ui/Button'
import type { DrivePhoto, EditState, Overlay } from '../../../interfaces'
import { useFaces } from '../../../vision/hooks'
import { EditorStage } from './EditorStage'
import {
  applyFaces,
  cropForRatio,
  croppedSize,
  downscale,
  orientedSize,
  outputSize,
  renderEdit,
} from '../utils/edit'
import { AdjustPanel } from '../panels/AdjustPanel'
import { CropPanel } from '../panels/CropPanel'
import { FacesPanel } from '../panels/FacesPanel'
import { FiltersPanel } from '../panels/FiltersPanel'
import { FramePanel } from '../panels/FramePanel'
import { SavePanel } from '../panels/SavePanel'
import { SizePanel } from '../panels/SizePanel'
import { TextPanel } from '../panels/TextPanel'
import styles from '../PhotoEditor.module.css'
import { useSaveForm } from '../hooks/useSaveForm'
import {
  FILTERS,
  INITIAL_STATE,
  PREVIEW_SIDE,
  RATIOS,
  TABS,
  THUMB_SIDE,
  type Tab,
} from '../constants'

export function Editor({
  token,
  photo,
  source,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  source: HTMLCanvasElement
  onClose: () => void
}) {
  const [state, setState] = useState<EditState>(INITIAL_STATE)
  const [tab, setTab] = useState<Tab>('crop')
  const [ratioId, setRatioId] = useState('free')
  const [selected, setSelected] = useState<number | null>(null)
  const nextId = useRef(1)
  const patch = (changes: Partial<EditState>) =>
    setState((s) => ({ ...s, ...changes }))

  const dirty = JSON.stringify(state) !== JSON.stringify(INITIAL_STATE)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const requestClose = () => {
    if (!dirtyRef.current || window.confirm('Discard your edits?')) onClose()
  }

  useEffect(() => {
    // Captured so the lightbox underneath doesn't also close.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (!dirtyRef.current || window.confirm('Discard your edits?')) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const faces = useFaces(token, photo.id, state.faces !== 'none')
  const regions = faces.data?.faces

  const previewSource = useMemo(() => downscale(source, PREVIEW_SIDE), [source])
  const previewFaces = useMemo(
    () =>
      regions
        ? applyFaces(previewSource, regions, state.faces, state.faceEmoji)
        : previewSource,
    [previewSource, regions, state.faces, state.faceEmoji],
  )

  const thumbs = useMemo(() => {
    const small = downscale(source, 200)
    return FILTERS.map((preset) => ({
      id: preset.id,
      name: preset.name,
      url: renderEdit(
        small,
        {
          ...INITIAL_STATE,
          crop: cropForRatio(1, { w: small.width, h: small.height }),
          filter: preset.id,
        },
        { maxSide: THUMB_SIDE, bare: true },
      ).toDataURL('image/jpeg', 0.7),
    }))
  }, [source])

  const deferred = useDeferredValue(state)
  const cropping = tab === 'crop'
  const rendered = useMemo(
    () =>
      renderEdit(previewFaces, deferred, {
        maxSide: PREVIEW_SIDE,
        uncropped: cropping,
      }),
    [previewFaces, deferred, cropping],
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = rendered.width
    canvas.height = rendered.height
    canvas.getContext('2d')!.drawImage(rendered, 0, 0)
  }, [rendered])

  const oriented = orientedSize(source, state.rotate)
  const ratioOption = RATIOS.find((r) => r.id === ratioId)!
  const lockedRatio =
    ratioOption.value === 'original'
      ? oriented.w / oriented.h
      : ratioOption.value

  const pickRatio = (id: string) => {
    setRatioId(id)
    const option = RATIOS.find((r) => r.id === id)!
    const value =
      option.value === 'original' ? oriented.w / oriented.h : option.value
    if (value)
      patch({ crop: cropForRatio(value, { w: oriented.w, h: oriented.h }) })
  }

  const rotate = (turns: number) => {
    const rotated = (((state.rotate + turns) % 4) + 4) % 4
    setRatioId('free')
    patch({
      rotate: rotated,
      crop: INITIAL_STATE.crop,
      width: null,
    })
  }

  const size = croppedSize(source, state)
  const out = outputSize(source, state)
  const framePad =
    state.frame.style === 'none'
      ? 0
      : Math.round((Math.min(out.w, out.h) * state.frame.size) / 100)
  const finalW = out.w + framePad * 2
  const finalH =
    out.h +
    framePad +
    (state.frame.style === 'polaroid' ? framePad * 3 : framePad)

  const selectedOverlay = state.overlays.find((o) => o.id === selected)
  const updateOverlay = (id: number, changes: Partial<Overlay>) =>
    patch({
      overlays: state.overlays.map((o) =>
        o.id === id ? { ...o, ...changes } : o,
      ),
    })
  const addOverlay = (kind: Overlay['kind'], text: string) => {
    const id = nextId.current++
    patch({
      overlays: [
        ...state.overlays,
        {
          id,
          kind,
          text,
          x: 0.5,
          y: kind === 'text' ? 0.85 : 0.5,
          size: kind === 'text' ? 0.08 : 0.18,
          color: '#ffffff',
          style: 'outline',
          bold: true,
        },
      ],
    })
    setSelected(id)
  }
  const removeOverlay = (id: number) => {
    patch({ overlays: state.overlays.filter((o) => o.id !== id) })
    setSelected(null)
  }

  const saveForm = useSaveForm({
    token,
    photo,
    source,
    state,
    regions,
    onClose,
  })

  const faceBusy = state.faces !== 'none' && !faces.data && !faces.error

  return (
    <>
      <EditorStage
        canvasRef={canvasRef}
        aspect={rendered.width / rendered.height}
        cropping={cropping}
        crop={state.crop}
        lockedRatio={lockedRatio}
        imageAspect={oriented.w / oriented.h}
        onCropChange={(crop) => patch({ crop, width: null })}
        placing={tab === 'text'}
        marker={selectedOverlay}
        onPlace={(x, y) =>
          selected !== null && updateOverlay(selected, { x, y })
        }
        faceBusy={faceBusy}
      />

      <aside className={styles.panel} aria-label="Photo editor">
        <header className={styles.header}>
          <h2>Edit photo</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close editor"
            onClick={requestClose}
          >
            &times;
          </button>
        </header>
        <div className={styles.tabs} role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? styles.tabActive : styles.tab}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {tab === 'crop' && (
            <CropPanel
              state={state}
              patch={patch}
              ratioId={ratioId}
              onPickRatio={pickRatio}
              onRotate={rotate}
            />
          )}
          {tab === 'filters' && (
            <FiltersPanel state={state} patch={patch} thumbs={thumbs} />
          )}
          {tab === 'adjust' && <AdjustPanel state={state} patch={patch} />}
          {tab === 'text' && (
            <TextPanel
              overlays={state.overlays}
              selected={selected}
              onSelect={setSelected}
              onAdd={addOverlay}
              onUpdate={updateOverlay}
              onRemove={removeOverlay}
            />
          )}
          {tab === 'faces' && (
            <FacesPanel state={state} patch={patch} faces={faces} />
          )}
          {tab === 'frame' && <FramePanel state={state} patch={patch} />}
          {tab === 'size' && (
            <SizePanel
              state={state}
              patch={patch}
              size={size}
              outHeight={out.h}
            />
          )}
          {tab === 'save' && (
            <SavePanel
              photo={photo}
              form={saveForm}
              finalW={finalW}
              finalH={finalH}
            />
          )}
        </div>

        <footer className={styles.footer}>
          <Button
            variant="outline"
            small
            disabled={!dirty}
            onClick={() => {
              setState(INITIAL_STATE)
              setRatioId('free')
              setSelected(null)
            }}
          >
            Reset all
          </Button>
          <span className={styles.hint}>
            {finalW} × {finalH}
          </span>
        </footer>
      </aside>
    </>
  )
}
