import { toBitmap } from '../vision/vision'

export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export type OverlayStyle = 'plain' | 'outline' | 'band'

/** Text or an emoji sticker; position and size are fractions of the output. */
export interface Overlay {
  id: number
  kind: 'text' | 'emoji'
  text: string
  x: number
  y: number
  /** Font size as a fraction of the output height. */
  size: number
  color: string
  style: OverlayStyle
  bold: boolean
}

export type FaceMode = 'none' | 'blur' | 'pixelate' | 'emoji'
export type FrameStyle = 'none' | 'solid' | 'polaroid'

export interface Adjust {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  fade: number
  glow: number
  blur: number
  vignette: number
  grain: number
}

export interface EditState {
  /** Quarter turns clockwise. */
  rotate: number
  flipX: boolean
  flipY: boolean
  /** Straighten angle in degrees. */
  angle: number
  /** Fractions of the rotated image. */
  crop: Crop
  /** Output width in pixels before the frame (height follows the crop); null keeps the cropped size. */
  width: number | null
  filter: string
  filterAmount: number
  adjust: Adjust
  faces: FaceMode
  faceEmoji: string
  frame: { style: FrameStyle; color: string; size: number }
  overlays: Overlay[]
}

export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 }

export const NO_ADJUST: Adjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  fade: 0,
  glow: 0,
  blur: 0,
  vignette: 0,
  grain: 0,
}

export const INITIAL_STATE: EditState = {
  rotate: 0,
  flipX: false,
  flipY: false,
  angle: 0,
  crop: FULL_CROP,
  width: null,
  filter: 'none',
  filterAmount: 100,
  adjust: NO_ADJUST,
  faces: 'none',
  faceEmoji: '😎',
  frame: { style: 'none', color: '#ffffff', size: 4 },
  overlays: [],
}

interface Tint {
  color: string
  alpha: number
  mode: GlobalCompositeOperation
}

export interface FilterPreset {
  id: string
  name: string
  brightness?: number
  contrast?: number
  saturate?: number
  sepia?: number
  grayscale?: number
  hue?: number
  fade?: number
  vignette?: number
  grain?: number
  glow?: number
  tint?: Tint
}

export const FILTERS: FilterPreset[] = [
  { id: 'none', name: 'Original' },
  {
    id: 'clarendon',
    name: 'Clarendon',
    contrast: 1.2,
    saturate: 1.35,
    brightness: 1.05,
    tint: { color: '#7fbbe3', alpha: 0.18, mode: 'overlay' },
  },
  {
    id: 'juno',
    name: 'Juno',
    contrast: 1.1,
    saturate: 1.4,
    sepia: 0.1,
    tint: { color: '#ffa700', alpha: 0.12, mode: 'overlay' },
  },
  {
    id: 'lark',
    name: 'Lark',
    brightness: 1.12,
    contrast: 0.95,
    saturate: 1.2,
    tint: { color: '#c8e1ff', alpha: 0.18, mode: 'soft-light' },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    brightness: 1.05,
    contrast: 0.9,
    hue: -10,
    sepia: 0.05,
    fade: 28,
  },
  {
    id: 'valencia',
    name: 'Valencia',
    contrast: 1.08,
    brightness: 1.08,
    sepia: 0.08,
    tint: { color: '#ffe1b4', alpha: 0.25, mode: 'soft-light' },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    saturate: 1.3,
    hue: -8,
    tint: { color: '#ff783c', alpha: 0.28, mode: 'overlay' },
  },
  {
    id: 'frost',
    name: 'Frost',
    brightness: 1.05,
    saturate: 0.9,
    tint: { color: '#50a0ff', alpha: 0.28, mode: 'overlay' },
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    brightness: 1.08,
    contrast: 0.92,
    saturate: 1.2,
    fade: 14,
    glow: 55,
  },
  { id: 'pop', name: 'Pop', contrast: 1.3, saturate: 1.7 },
  {
    id: 'cyber',
    name: 'Cyber',
    hue: 20,
    saturate: 1.6,
    contrast: 1.2,
    tint: { color: '#ff00c8', alpha: 0.2, mode: 'soft-light' },
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    sepia: 0.2,
    contrast: 0.95,
    brightness: 1.1,
    saturate: 1.2,
    fade: 22,
    vignette: 22,
  },
  {
    id: 'vintage',
    name: 'Vintage',
    sepia: 0.35,
    contrast: 0.9,
    saturate: 0.8,
    brightness: 1.05,
    fade: 30,
    vignette: 30,
    grain: 25,
  },
  { id: 'sepia', name: 'Sepia', sepia: 0.9, contrast: 1.05 },
  { id: 'moon', name: 'Moon', grayscale: 1, contrast: 1.1, brightness: 1.1 },
  {
    id: 'noir',
    name: 'Noir',
    grayscale: 1,
    contrast: 1.5,
    brightness: 0.9,
    vignette: 40,
  },
]

export const MAX_SOURCE_SIDE = 4096
const MAX_OUTPUT_SIDE = 8192

/** Decodes the photo upright, scaled down to a size that is safe to edit. */
export async function decodeForEditing(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await toBitmap(blob)
  const scale = Math.min(
    1,
    MAX_SOURCE_SIDE / Math.max(bitmap.width, bitmap.height),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

export function downscale(
  source: HTMLCanvasElement,
  maxSide: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Size of the rotated image before cropping. */
export function orientedSize(
  source: { width: number; height: number },
  rotate: number,
) {
  return rotate % 2
    ? { w: source.height, h: source.width }
    : { w: source.width, h: source.height }
}

/** Natural pixel size of the cropped image. */
export function croppedSize(
  source: { width: number; height: number },
  state: Pick<EditState, 'rotate' | 'crop'>,
) {
  const o = orientedSize(source, state.rotate)
  return {
    w: Math.max(1, Math.round(state.crop.w * o.w)),
    h: Math.max(1, Math.round(state.crop.h * o.h)),
  }
}

/** Pixel size of the image area of the output, before the frame is added. */
export function outputSize(
  source: { width: number; height: number },
  state: Pick<EditState, 'rotate' | 'crop' | 'width'>,
) {
  const cropped = croppedSize(source, state)
  const size = state.width
    ? {
        w: state.width,
        h: Math.max(1, Math.round((state.width * cropped.h) / cropped.w)),
      }
    : cropped
  const k = Math.min(1, MAX_OUTPUT_SIDE / Math.max(size.w, size.h))
  return {
    w: Math.max(1, Math.round(size.w * k)),
    h: Math.max(1, Math.round(size.h * k)),
  }
}

/** Zoom that keeps a rotated rectangle covering its original frame. */
function straightenZoom(angle: number, w: number, h: number) {
  const rad = (Math.abs(angle) * Math.PI) / 180
  return Math.cos(rad) + Math.sin(rad) * Math.max(w / h, h / w)
}

interface Effective {
  filter: string
  tint?: Tint
  warmth: number
  fade: number
  glow: number
  blur: number
  vignette: number
  grain: number
}

const lerp = (neutral: number, value: number | undefined, t: number) =>
  value === undefined ? neutral : neutral + (value - neutral) * t

function effective(state: EditState): Effective {
  const preset = FILTERS.find((f) => f.id === state.filter) ?? FILTERS[0]
  const t = state.filterAmount / 100
  const a = state.adjust
  const brightness =
    lerp(1, preset.brightness, t) * (1 + (a.brightness / 100) * 0.5)
  const contrast = lerp(1, preset.contrast, t) * (1 + (a.contrast / 100) * 0.6)
  const saturate = lerp(1, preset.saturate, t) * (1 + a.saturation / 100)
  const sepia = lerp(0, preset.sepia, t)
  const grayscale = lerp(0, preset.grayscale, t)
  const hue = lerp(0, preset.hue, t)
  const parts = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${Math.max(0, saturate).toFixed(3)})`,
  ]
  if (sepia) parts.push(`sepia(${sepia.toFixed(3)})`)
  if (grayscale) parts.push(`grayscale(${grayscale.toFixed(3)})`)
  if (hue) parts.push(`hue-rotate(${hue.toFixed(1)}deg)`)
  return {
    filter: parts.join(' '),
    tint: preset.tint && { ...preset.tint, alpha: preset.tint.alpha * t },
    warmth: a.warmth,
    fade: a.fade + (preset.fade ?? 0) * t,
    glow: a.glow + (preset.glow ?? 0) * t,
    blur: a.blur,
    vignette: a.vignette + (preset.vignette ?? 0) * t,
    grain: a.grain + (preset.grain ?? 0) * t,
  }
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

/** Covers faces (fractions of the source) with a blur, pixelation or emoji. */
export function applyFaces(
  source: HTMLCanvasElement,
  regions: readonly Region[],
  mode: FaceMode,
  emoji: string,
): HTMLCanvasElement {
  if (mode === 'none' || regions.length === 0) return source
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0)
  for (const r of regions) {
    const padX = r.width * 0.2
    const padY = r.height * 0.25
    const x = Math.max(0, (r.x - padX) * source.width)
    const y = Math.max(0, (r.y - padY) * source.height)
    const w = Math.min(source.width - x, (r.width + padX * 2) * source.width)
    const h = Math.min(source.height - y, (r.height + padY * 2) * source.height)
    if (w < 2 || h < 2) continue
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.clip()
    if (mode === 'pixelate') {
      const small = document.createElement('canvas')
      small.width = 10
      small.height = Math.max(1, Math.round((10 * h) / w))
      small
        .getContext('2d')!
        .drawImage(source, x, y, w, h, 0, 0, small.width, small.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(small, x, y, w, h)
      ctx.imageSmoothingEnabled = true
    } else if (mode === 'blur') {
      ctx.filter = `blur(${Math.max(w, h) / 5}px)`
      ctx.drawImage(source, 0, 0)
    } else {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.max(w, h) * 1.05}px ${EMOJI_FONT}`
      ctx.fillText(emoji, x + w / 2, y + h / 2 + h * 0.05)
    }
    ctx.restore()
  }
  return canvas
}

let grainTile: HTMLCanvasElement | undefined
function getGrainTile() {
  if (grainTile) return grainTile
  grainTile = document.createElement('canvas')
  grainTile.width = grainTile.height = 192
  const ctx = grainTile.getContext('2d')!
  const data = ctx.createImageData(192, 192)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 255
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v
    data.data[i + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  return grainTile
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: readonly Overlay[],
  w: number,
  h: number,
) {
  for (const o of overlays) {
    if (!o.text.trim()) continue
    const size = o.size * h
    const family =
      o.kind === 'emoji'
        ? EMOJI_FONT
        : '"Inter Variable", system-ui, "Segoe UI", sans-serif'
    ctx.font = `${o.bold && o.kind === 'text' ? 800 : 500} ${size}px ${family}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = o.text.split('\n')
    const lineHeight = size * 1.15
    const top = o.y * h - ((lines.length - 1) * lineHeight) / 2
    if (o.kind === 'text' && o.style === 'band') {
      ctx.fillStyle = 'rgb(0 0 0 / 0.55)'
      const bandHeight = lines.length * lineHeight + size * 0.5
      ctx.fillRect(0, o.y * h - bandHeight / 2, w, bandHeight)
    }
    lines.forEach((line, i) => {
      const y = top + i * lineHeight
      if (o.kind === 'text' && o.style === 'outline') {
        ctx.lineJoin = 'round'
        ctx.lineWidth = size * 0.16
        ctx.strokeStyle = '#000'
        ctx.strokeText(line, o.x * w, y)
      }
      ctx.fillStyle = o.kind === 'text' && o.style === 'band' ? '#fff' : o.color
      ctx.fillText(line, o.x * w, y)
    })
  }
}

export interface RenderOptions {
  /** Longest side of the result, in pixels; omit for full size. */
  maxSide?: number
  /** Shows the whole straightened image, for cropping. */
  uncropped?: boolean
  /** Leaves out text and stickers. */
  bare?: boolean
}

/** Draws the edited image: geometry first, then colour, then frame and overlays. */
export function renderEdit(
  source: HTMLCanvasElement,
  state: EditState,
  options: RenderOptions = {},
): HTMLCanvasElement {
  const view: EditState = options.uncropped
    ? { ...state, crop: FULL_CROP, width: null }
    : state
  const o = orientedSize(source, view.rotate)
  const natural = outputSize(source, view)
  const frame = state.frame
  const framed = frame.style !== 'none' && !options.uncropped
  const pad = framed
    ? Math.round((Math.min(natural.w, natural.h) * frame.size) / 100)
    : 0
  const bottomPad = framed && frame.style === 'polaroid' ? pad * 3 : pad
  const totalW = natural.w + pad * 2
  const totalH = natural.h + pad + bottomPad
  const k = Math.min(
    1,
    (options.maxSide ?? Infinity) / Math.max(totalW, totalH),
  )
  const W = Math.max(1, Math.round(natural.w * k))
  const H = Math.max(1, Math.round(natural.h * k))
  const padK = Math.round(pad * k)
  const bottomK = Math.round(bottomPad * k)

  const canvas = document.createElement('canvas')
  canvas.width = W + padK * 2
  canvas.height = H + padK + bottomK
  const out = canvas.getContext('2d')!
  const inner = document.createElement('canvas')
  inner.width = W
  inner.height = H
  const ctx = inner.getContext('2d')!
  const fx = effective(state)
  const canFilter = 'filter' in ctx

  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  if (canFilter) {
    ctx.filter = fx.blur
      ? `${fx.filter} blur(${((fx.blur / 100) * W * 0.02).toFixed(2)}px)`
      : fx.filter
  }
  ctx.scale(W / (view.crop.w * o.w), H / (view.crop.h * o.h))
  ctx.translate(-view.crop.x * o.w, -view.crop.y * o.h)
  ctx.translate(o.w / 2, o.h / 2)
  ctx.rotate((view.angle * Math.PI) / 180)
  const zoom = straightenZoom(view.angle, o.w, o.h)
  ctx.scale(zoom, zoom)
  ctx.scale(view.flipX ? -1 : 1, view.flipY ? -1 : 1)
  ctx.rotate((view.rotate * Math.PI) / 2)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  ctx.restore()

  if (fx.glow > 0 && canFilter) {
    const copy = document.createElement('canvas')
    copy.width = W
    copy.height = H
    copy.getContext('2d')!.drawImage(inner, 0, 0)
    ctx.save()
    ctx.filter = `blur(${(W * 0.012).toFixed(2)}px) brightness(1.15)`
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.min(1, (fx.glow / 100) * 0.7)
    ctx.drawImage(copy, 0, 0)
    ctx.restore()
  }
  if (fx.tint && fx.tint.alpha > 0) {
    ctx.save()
    ctx.globalCompositeOperation = fx.tint.mode
    ctx.globalAlpha = Math.min(1, fx.tint.alpha)
    ctx.fillStyle = fx.tint.color
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (fx.warmth) {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = (Math.abs(fx.warmth) / 100) * 0.4
    ctx.fillStyle = fx.warmth > 0 ? '#ff9632' : '#3c8cff'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (fx.fade > 0) {
    const lift = Math.round((Math.min(fx.fade, 100) / 100) * 70)
    ctx.save()
    ctx.globalCompositeOperation = 'lighten'
    ctx.fillStyle = `rgb(${lift} ${lift} ${lift + 6})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (fx.grain > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = Math.min(1, (fx.grain / 100) * 0.5)
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat')!
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (fx.vignette > 0) {
    const gradient = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.25,
      W / 2,
      H / 2,
      Math.hypot(W, H) / 2,
    )
    gradient.addColorStop(0, 'rgb(0 0 0 / 0)')
    gradient.addColorStop(
      1,
      `rgb(0 0 0 / ${(Math.min(fx.vignette, 100) / 100) * 0.85})`,
    )
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, W, H)
  }

  if (framed) {
    out.fillStyle = frame.color
    out.fillRect(0, 0, canvas.width, canvas.height)
  }
  out.drawImage(inner, padK, padK)
  if (!options.bare && !options.uncropped)
    drawOverlays(out, state.overlays, canvas.width, canvas.height)
  return canvas
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not encode the image')),
      type,
      quality,
    ),
  )
}

export const FORMATS = [
  { type: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { type: 'image/png', label: 'PNG', ext: 'png' },
  { type: 'image/webp', label: 'WebP', ext: 'webp' },
] as const

/** "holiday.heic" -> "holiday" */
export function fileStem(name: string): string {
  return name.replace(/\.[^./\\]+$/, '')
}

/** Largest centred crop with the given pixel aspect ratio inside an image of this size. */
export function cropForRatio(
  ratio: number,
  size: { w: number; h: number },
): Crop {
  const imageRatio = size.w / size.h
  if (ratio >= imageRatio) {
    const h = imageRatio / ratio
    return { x: 0, y: (1 - h) / 2, w: 1, h }
  }
  const w = ratio / imageRatio
  return { x: (1 - w) / 2, y: 0, w, h: 1 }
}
