const numberFormat = new Intl.NumberFormat()

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Drive reports EXIF capture times as `YYYY:MM:DD HH:MM:SS`; other dates are ISO. */
export function parseDate(value: string | undefined): Date | undefined {
  if (!value) return
  const date = new Date(value.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T'))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDate(value: string | undefined): string | undefined {
  const date = parseDate(value)
  if (!date) return
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatBytes(
  value: string | number | undefined,
): string | undefined {
  const bytes = Number(value)
  if (value === undefined || !Number.isFinite(bytes)) return
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes
  let unit = -1
  do {
    size /= 1024
    unit++
  } while (size >= 1024 && unit < units.length - 1)
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`
}
