import type { SVGProps } from 'react'
import { ICON_PROPS } from '../constants'
import {
  CHEVRON_ICON_PATH,
  CLOSE_ICON_PATH,
  FOLDER_ICON_PATH,
  GEAR_ICON_PATH,
  MAP_ICON_FOLDS_PATH,
  MAP_ICON_PATH,
  PHOTOS_ICON_PATH,
} from './constants'

type IconProps = SVGProps<SVGSVGElement>

function Icon(props: IconProps) {
  return <svg {...ICON_PROPS} aria-hidden="true" {...props} />
}

export function ChevronIcon(props: IconProps) {
  return (
    <Icon width="12" height="12" strokeWidth="3" {...props}>
      <path d={CHEVRON_ICON_PATH} />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={CLOSE_ICON_PATH} />
    </Icon>
  )
}

export function PhotosIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d={PHOTOS_ICON_PATH} />
    </Icon>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={MAP_ICON_PATH} />
      <path d={MAP_ICON_FOLDS_PATH} />
    </Icon>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={FOLDER_ICON_PATH} />
    </Icon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d={GEAR_ICON_PATH} />
    </Icon>
  )
}
