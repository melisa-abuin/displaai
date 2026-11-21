/** Shared interfaces and types used across the app. */

export interface AccessToken {
  value: string
  expiresAt: number
}

export interface AuthState {
  token: string | null
  error: string | null
  isConfigured: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export interface DriveFolder {
  id: string
  name: string
  parentId?: string
  path: string
  /** False for folders other people shared with you. */
  ownedByMe: boolean
  /** Images directly inside this folder (not in subfolders). */
  photoCount: number
  /** Images in this folder and all of its subfolders. */
  totalCount: number
}

export interface DrivePhoto {
  id: string
  name: string
  mimeType: string
  /** Ids of the folders containing the photo; always present for photos from the local index. */
  parents?: string[]
  thumbnailLink?: string
  /** When `thumbnailLink` was fetched (ms); the link expires after a while. */
  thumbnailAt?: number
  /** Present only when the image has EXIF data (GPS may be missing). */
  imageMediaMetadata?: {
    location?: { latitude: number; longitude: number; altitude?: number }
    time?: string
    width?: number
    height?: number
  }
  createdTime?: string
  /** Bytes, as a string (Drive's format). */
  size?: string
  /** Custom properties private to this app; tags are stored as 'tag.<hash>' keys holding the tag name. */
  appProperties?: Record<string, string>
}

export interface TagCount {
  name: string
  count: number
}

export interface Library {
  folders: DriveFolder[]
  /** Every distinct tag used by any photo in the Drive. */
  tags: TagCount[]
}

/** A photo as kept in the local index. */
export interface IndexedPhoto extends DrivePhoto {
  parents: string[]
}

/** A folder as kept in the local index. */
export interface IndexedFolder {
  id: string
  name: string
  parents?: string[]
  ownedByMe: boolean
}

export interface PhotoPage {
  /** The folder all the photos of this page are in. */
  folderId?: string
  files: DrivePhoto[]
}

export interface PhotoLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  thumbnailLink?: string
  thumbnailAt?: number
  /** The folder (album) the photo is in. */
  parentId?: string
  /** EXIF capture time, falling back to when the file was added. */
  date?: string
}

export interface ConnectedFolder {
  id: string
  /** Also show everything inside the folder's subfolders. */
  recursive: boolean
}

export interface FolderIndex {
  byId: Map<string, DriveFolder>
  /** Non-empty folders grouped by parent; top-level folders are under `null`. */
  children: Map<string | null, DriveFolder[]>
}

export interface TagChange {
  photoId: string
  add: string[]
  remove: string[]
}

/** `any` keeps photos with at least one selected tag, `all` those with every one. */
export type TagMatch = 'any' | 'all'

export interface TagFilter {
  /** Tags to include, combined according to `match`. */
  tags: readonly string[]
  /** Photos with any of these tags are always left out. */
  exclude: readonly string[]
  match: TagMatch
}

interface ViewFolder {
  id: string
  /** Also include everything inside the folder's subfolders. */
  recursive: boolean
}

/** A saved gallery: photos from some folders (all connected ones if none), narrowed by tags. */
export interface CustomView {
  id: string
  name: string
  folders: ViewFolder[]
  tags: string[]
  exclude: string[]
  match: TagMatch
}

export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

type OverlayStyle = 'plain' | 'outline' | 'band'

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

export interface Tint {
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

type FrameStyle = 'none' | 'solid' | 'polaroid'

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

/** A region of an image; every coordinate is a 0-1 fraction of the image's size. */
export interface Region {
  x: number
  y: number
  width: number
  height: number
  score: number
  label?: string
}

export type MediaKind = 'images' | 'gifs' | 'videos'

export type SortOrder = 'taken-desc' | 'taken-asc' | 'added-desc' | 'added-asc'

export interface TimelineMonth {
  key: number
  year?: number
  label: string
  /** Index of the month's heading in the list. */
  itemIndex: number
}
