import { useQuery } from '@tanstack/react-query'
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button } from '../components/Button'
import {
  fetchPhotoBlob,
  tagProperties,
  type DrivePhoto,
  type IndexedPhoto,
} from '../drive/api'
import {
  useRenamePhoto,
  useSaveEditedPhoto,
  useTrashPhoto,
} from '../drive/hooks'
import { useFaces } from '../vision/hooks'
import { CropBox } from './CropBox'
import {
  FILTERS,
  FORMATS,
  INITIAL_STATE,
  MAX_SOURCE_SIDE,
  applyFaces,
  canvasToBlob,
  cropForRatio,
  croppedSize,
  decodeForEditing,
  downscale,
  fileStem,
  orientedSize,
  outputSize,
  renderEdit,
  type Adjust,
  type EditState,
  type FaceMode,
  type Overlay,
} from './edit'
import styles from './PhotoEditor.module.css'

/** The folder the photo sits in, from the local index. */
function indexedParent(photo: DrivePhoto): string | undefined {
  return (photo as Partial<IndexedPhoto>).parents?.[0]
}

const PREVIEW_SIDE = 1400
const THUMB_SIDE = 96

type Tab =
  'crop' | 'filters' | 'adjust' | 'text' | 'faces' | 'frame' | 'size' | 'save'

const TABS: [Tab, string][] = [
  ['crop', 'Crop'],
  ['filters', 'Filters'],
  ['adjust', 'Adjust'],
  ['text', 'Text & stickers'],
  ['faces', 'Faces'],
  ['frame', 'Frame'],
  ['size', 'Resize'],
  ['save', 'Save'],
]

const RATIOS: {
  id: string
  label: string
  value: number | 'original' | null
}[] = [
  { id: 'free', label: 'Free', value: null },
  { id: 'original', label: 'Original', value: 'original' },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '2:3', label: '2:3', value: 2 / 3 },
]

const ADJUSTMENTS: [keyof Adjust, string, number, number][] = [
  ['brightness', 'Brightness', -100, 100],
  ['contrast', 'Contrast', -100, 100],
  ['saturation', 'Saturation', -100, 100],
  ['warmth', 'Warmth', -100, 100],
  ['fade', 'Fade', 0, 100],
  ['glow', 'Glow', 0, 100],
  ['blur', 'Blur', 0, 100],
  ['vignette', 'Vignette', 0, 100],
  ['grain', 'Grain', 0, 100],
]

const STICKERS = [
  '😀',
  '😍',
  '😎',
  '🥳',
  '🔥',
  '❤️',
  '✨',
  '🎉',
  '🌈',
  '⭐',
  '💯',
  '👑',
  '🐶',
  '🐱',
  '🌸',
  '☀️',
]
const FACE_EMOJI = ['😎', '🥸', '🤡', '😺', '🐵', '👽', '🤖', '🙈']
const SIZE_PRESETS = [4096, 2048, 1080, 720, 480]
const FRAME_COLORS = ['#ffffff', '#000000', '#f6a655', '#aa85f8', '#ff5d8f']

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className={styles.slider}>
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [T, ReactNode][]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map(([id, content]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={value === id ? styles.chipActive : styles.chip}
          onClick={() => onChange(id)}
        >
          {content}
        </button>
      ))}
    </div>
  )
}

export function PhotoEditor({
  token,
  photo,
  onClose,
}: {
  token: string
  photo: DrivePhoto
  onClose: () => void
}) {
  const { data: blob, error: loadError } = useQuery({
    queryKey: ['drive', 'photo-blob', photo.id],
    queryFn: () => fetchPhotoBlob(token, photo.id),
    staleTime: 1000 * 30,
    gcTime: 0,
    meta: { persist: false },
  })
  const [source, setSource] = useState<HTMLCanvasElement>()
  const [decodeError, setDecodeError] = useState<string>()

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    decodeForEditing(blob).then(
      (canvas) => !cancelled && setSource(canvas),
      (e: unknown) =>
        !cancelled &&
        setDecodeError(e instanceof Error ? e.message : 'Could not open image'),
    )
    return () => {
      cancelled = true
    }
  }, [blob])

  const failure = loadError?.message ?? decodeError

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${photo.name}`}
    >
      {source ? (
        <Editor token={token} photo={photo} source={source} onClose={onClose} />
      ) : (
        <div className={styles.loading} role="status">
          {failure ? (
            <>
              <p role="alert">Could not open the photo: {failure}</p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </>
          ) : (
            <>
              <span className={styles.spinner} />
              <p>Opening photo…</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Editor({
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
  const widthValue = state.width ?? size.w
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

  const placing = useRef(false)
  const place = (e: React.PointerEvent<HTMLElement>) => {
    if (selected === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    updateOverlay(selected, {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    })
  }

  // Saving
  const stem = fileStem(photo.name)
  const [mode, setMode] = useState<'copy' | 'overwrite' | 'rename'>('copy')
  const [name, setName] = useState(`${stem}-edited`)
  const nameTouched = useRef(false)
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(FORMATS[0])
  const [quality, setQuality] = useState(92)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const save = useSaveEditedPhoto(token)
  const rename = useRenamePhoto(token)
  const trash = useTrashPhoto(token)
  const [trashConfirming, setTrashConfirming] = useState(false)
  const originalExt = photo.name.match(/\.([^./\\]+)$/)?.[1]

  const chooseMode = (next: typeof mode) => {
    setMode(next)
    setConfirming(false)
    setMessage(undefined)
    if (!nameTouched.current) setName(next === 'copy' ? `${stem}-edited` : stem)
  }

  const cleanName = name.replace(/[\\/]/g, '').trim()
  const finalName = cleanName
    ? `${cleanName}.${mode === 'rename' ? (originalExt ?? 'jpg') : format.ext}`
    : ''

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

  const faceBusy = state.faces !== 'none' && !faces.data && !faces.error
  const aspect = rendered.width / rendered.height

  return (
    <>
      <div className={styles.stage}>
        <div className={styles.stageInner}>
          <div
            className={styles.canvasWrap}
            style={{
              width: `min(100cqw, calc(100cqh * ${aspect}))`,
              aspectRatio: String(aspect),
            }}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              aria-label="Edited preview"
            />
            {cropping && (
              <CropBox
                crop={state.crop}
                ratio={lockedRatio}
                imageAspect={oriented.w / oriented.h}
                onChange={(crop) => patch({ crop, width: null })}
              />
            )}
            {tab === 'text' && (
              <div
                className={styles.placeLayer}
                onPointerDown={(e) => {
                  placing.current = true
                  e.currentTarget.setPointerCapture(e.pointerId)
                  place(e)
                }}
                onPointerMove={(e) => placing.current && place(e)}
                onPointerUp={() => (placing.current = false)}
                onPointerCancel={() => (placing.current = false)}
              >
                {selectedOverlay && (
                  <span
                    className={styles.marker}
                    style={{
                      left: `${selectedOverlay.x * 100}%`,
                      top: `${selectedOverlay.y * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
          {faceBusy && (
            <div className={styles.toast} role="status">
              Detecting faces…
            </div>
          )}
        </div>
      </div>

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
            <>
              <h3>Aspect ratio</h3>
              <Chips
                label="Aspect ratio"
                value={ratioId}
                onChange={pickRatio}
                options={RATIOS.map((r) => [r.id, r.label])}
              />
              <h3>Rotate &amp; flip</h3>
              <div className={styles.row}>
                <Button variant="outline" small onClick={() => rotate(-1)}>
                  ⟲ Left
                </Button>
                <Button variant="outline" small onClick={() => rotate(1)}>
                  ⟳ Right
                </Button>
                <Button
                  variant="outline"
                  small
                  onClick={() => patch({ flipX: !state.flipX })}
                >
                  ⇋ Flip
                </Button>
                <Button
                  variant="outline"
                  small
                  onClick={() => patch({ flipY: !state.flipY })}
                >
                  ⇅ Mirror
                </Button>
              </div>
              <Slider
                label="Straighten"
                value={state.angle}
                min={-45}
                max={45}
                step={0.5}
                suffix="°"
                onChange={(angle) => patch({ angle })}
              />
              <p className={styles.hint}>
                Drag the box on the photo to choose what to keep.
              </p>
            </>
          )}

          {tab === 'filters' && (
            <>
              <ul className={styles.filters} aria-label="Filters">
                {thumbs.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-pressed={state.filter === f.id}
                      className={
                        state.filter === f.id
                          ? styles.filterActive
                          : styles.filter
                      }
                      onClick={() => patch({ filter: f.id })}
                    >
                      <img src={f.url} alt="" />
                      <span>{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {state.filter !== 'none' && (
                <Slider
                  label="Intensity"
                  value={state.filterAmount}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(filterAmount) => patch({ filterAmount })}
                />
              )}
            </>
          )}

          {tab === 'adjust' && (
            <>
              {ADJUSTMENTS.map(([key, label, min, max]) => (
                <Slider
                  key={key}
                  label={label}
                  value={state.adjust[key]}
                  min={min}
                  max={max}
                  onChange={(value) =>
                    patch({ adjust: { ...state.adjust, [key]: value } })
                  }
                />
              ))}
              <Button
                variant="outline"
                small
                onClick={() => patch({ adjust: INITIAL_STATE.adjust })}
              >
                Reset adjustments
              </Button>
            </>
          )}

          {tab === 'text' && (
            <>
              <div className={styles.row}>
                <Button small onClick={() => addOverlay('text', 'Your text')}>
                  + Add text
                </Button>
              </div>
              <h3>Stickers</h3>
              <div className={styles.stickers}>
                {STICKERS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Add ${emoji} sticker`}
                    onClick={() => addOverlay('emoji', emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {state.overlays.length > 0 && (
                <>
                  <h3>On the photo</h3>
                  <ul className={styles.overlayList}>
                    {state.overlays.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          aria-pressed={selected === o.id}
                          className={
                            selected === o.id ? styles.chipActive : styles.chip
                          }
                          onClick={() => setSelected(o.id)}
                        >
                          {o.text.trim().split('\n')[0] || '(empty)'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {selectedOverlay ? (
                <div className={styles.group}>
                  {selectedOverlay.kind === 'text' && (
                    <>
                      <textarea
                        aria-label="Text"
                        rows={2}
                        value={selectedOverlay.text}
                        onChange={(e) =>
                          updateOverlay(selectedOverlay.id, {
                            text: e.target.value,
                          })
                        }
                      />
                      <Chips
                        label="Text style"
                        value={selectedOverlay.style}
                        onChange={(style) =>
                          updateOverlay(selectedOverlay.id, { style })
                        }
                        options={[
                          ['plain', 'Plain'],
                          ['outline', 'Outline'],
                          ['band', 'Banner'],
                        ]}
                      />
                      <label className={styles.inline}>
                        Colour
                        <input
                          type="color"
                          value={selectedOverlay.color}
                          onChange={(e) =>
                            updateOverlay(selectedOverlay.id, {
                              color: e.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  <Slider
                    label="Size"
                    value={Math.round(selectedOverlay.size * 100)}
                    min={3}
                    max={60}
                    onChange={(v) =>
                      updateOverlay(selectedOverlay.id, { size: v / 100 })
                    }
                  />
                  <p className={styles.hint}>
                    Click or drag on the photo to move it.
                  </p>
                  <Button
                    variant="outline"
                    small
                    onClick={() => removeOverlay(selectedOverlay.id)}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                state.overlays.length > 0 && (
                  <p className={styles.hint}>Pick an item to edit it.</p>
                )
              )}
            </>
          )}

          {tab === 'faces' && (
            <>
              <p className={styles.hint}>
                Faces are found on your device; nothing is uploaded.
              </p>
              <Chips<FaceMode>
                label="Face effect"
                value={state.faces}
                onChange={(faces) => patch({ faces })}
                options={[
                  ['none', 'Off'],
                  ['blur', 'Blur'],
                  ['pixelate', 'Pixelate'],
                  ['emoji', 'Emoji'],
                ]}
              />
              {state.faces === 'emoji' && (
                <div className={styles.stickers}>
                  {FACE_EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-pressed={state.faceEmoji === emoji}
                      aria-label={`Use ${emoji}`}
                      className={
                        state.faceEmoji === emoji ? styles.stickerActive : ''
                      }
                      onClick={() => patch({ faceEmoji: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {state.faces !== 'none' && (
                <p className={styles.hint} role="status">
                  {faces.error
                    ? `Face detection failed: ${faces.error.message}`
                    : !faces.data
                      ? 'Detecting faces…'
                      : `${faces.data.faces.length} ${faces.data.faces.length === 1 ? 'face' : 'faces'} found`}
                </p>
              )}
            </>
          )}

          {tab === 'frame' && (
            <>
              <Chips
                label="Frame style"
                value={state.frame.style}
                onChange={(style) =>
                  patch({
                    frame: {
                      ...state.frame,
                      style,
                      size: style === 'polaroid' ? 6 : state.frame.size,
                    },
                  })
                }
                options={[
                  ['none', 'None'],
                  ['solid', 'Border'],
                  ['polaroid', 'Polaroid'],
                ]}
              />
              {state.frame.style !== 'none' && (
                <>
                  <Slider
                    label="Thickness"
                    value={state.frame.size}
                    min={1}
                    max={20}
                    suffix="%"
                    onChange={(size) =>
                      patch({ frame: { ...state.frame, size } })
                    }
                  />
                  <div className={styles.swatches}>
                    {FRAME_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Frame colour ${color}`}
                        aria-pressed={state.frame.color === color}
                        style={{ background: color }}
                        onClick={() =>
                          patch({ frame: { ...state.frame, color } })
                        }
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom frame colour"
                      value={state.frame.color}
                      onChange={(e) =>
                        patch({
                          frame: { ...state.frame, color: e.target.value },
                        })
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'size' && (
            <>
              <h3>Longest side</h3>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={
                    state.width === null ? styles.chipActive : styles.chip
                  }
                  onClick={() => patch({ width: null })}
                >
                  Original
                </button>
                {SIZE_PRESETS.map((side) => {
                  const long = Math.max(size.w, size.h)
                  const width = Math.round(
                    size.w >= size.h ? side : (side * size.w) / size.h,
                  )
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={side >= long}
                      className={
                        state.width === width ? styles.chipActive : styles.chip
                      }
                      onClick={() => patch({ width })}
                    >
                      {side}px
                    </button>
                  )
                })}
              </div>
              <h3>Custom</h3>
              <div className={styles.row}>
                <label className={styles.inline}>
                  Width
                  <input
                    type="number"
                    min={16}
                    max={8192}
                    value={widthValue}
                    onChange={(e) => {
                      const v = Math.round(Number(e.target.value))
                      patch({
                        width: v >= 1 ? Math.min(8192, v) : null,
                      })
                    }}
                  />
                </label>
                <label className={styles.inline}>
                  Height
                  <input
                    type="number"
                    min={16}
                    max={8192}
                    value={out.h}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (v >= 1)
                        patch({
                          width: Math.min(
                            8192,
                            Math.max(1, Math.round((v * size.w) / size.h)),
                          ),
                        })
                    }}
                  />
                </label>
              </div>
              <p className={styles.hint}>
                The proportions stay locked. The editor works from up to{' '}
                {MAX_SOURCE_SIDE}px of the original, so larger sizes add no
                detail.
              </p>
            </>
          )}

          {tab === 'save' && (
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
                    onChange={(e) => {
                      nameTouched.current = true
                      setName(e.target.value)
                    }}
                  />
                  <span>
                    .{mode === 'rename' ? (originalExt ?? 'jpg') : format.ext}
                  </span>
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
                  The original stays untouched; the copy keeps its tags and goes
                  in the same folder.
                </p>
              )}
              {mode === 'overwrite' && (
                <p className={styles.warning}>
                  This replaces the photo in your Drive with the edited version.
                  Drive keeps the previous version for a while in the file's
                  version history.
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
                  onClick={() =>
                    mode === 'overwrite' ? setConfirming(true) : run()
                  }
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
                      discarded. You can restore the photo from the trash in
                      Google Drive.
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
