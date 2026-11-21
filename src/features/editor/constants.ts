import type { Adjust, Crop, EditState, FilterPreset } from '../../interfaces'

export const PREVIEW_SIDE = 1400

export const THUMB_SIDE = 96

export type Tab =
  'crop' | 'filters' | 'adjust' | 'text' | 'faces' | 'frame' | 'size' | 'save'

export const TABS: [Tab, string][] = [
  ['crop', 'Crop'],
  ['filters', 'Filters'],
  ['adjust', 'Adjust'],
  ['text', 'Text & stickers'],
  ['faces', 'Faces'],
  ['frame', 'Frame'],
  ['size', 'Resize'],
  ['save', 'Save'],
]

export const MIN_CROP_SIZE = 0.05

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

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

export const MAX_OUTPUT_SIDE = 8192

export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

export const FORMATS = [
  { type: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { type: 'image/png', label: 'PNG', ext: 'png' },
  { type: 'image/webp', label: 'WebP', ext: 'webp' },
] as const

export const RATIOS: {
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

export const ADJUSTMENTS: [keyof Adjust, string, number, number][] = [
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

export const FACE_EMOJI = ['😎', '🥸', '🤡', '😺', '🐵', '👽', '🤖', '🙈']

export const FRAME_COLORS = [
  '#ffffff',
  '#000000',
  '#f6a655',
  '#aa85f8',
  '#ff5d8f',
]

export const SIZE_PRESETS = [4096, 2048, 1080, 720, 480]

export const STICKERS = [
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
