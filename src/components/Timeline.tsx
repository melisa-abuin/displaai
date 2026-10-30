import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type RefObject,
} from 'react'
import styles from './Timeline.module.css'

export interface TimelineMonth {
  key: number
  year?: number
  label: string
  /** Index of the month's heading in the list. */
  itemIndex: number
}

const MIN_YEAR_GAP = 22
const MIN_MONTH_GAP = 7
const IDLE_MS = 1000

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * A scrubber along the edge of the screen, like Google Photos: year marks, a
 * handle following the scroll position, and a bubble naming the month under it.
 * Drag, click, or use the arrow keys to jump through the list.
 */
export function Timeline({
  months,
  itemCount,
  listRef,
  onSeek,
  className,
}: {
  className?: string
  months: readonly TimelineMonth[]
  itemCount: number
  /** The element holding the list, whose items carry `data-item-index`. */
  listRef: RefObject<HTMLElement | null>
  onSeek: (index: number) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const lastSeek = useRef<number | undefined>(undefined)
  const [railHeight, setRailHeight] = useState(0)
  // Fractional index of the list item at the top of the screen.
  const [position, setPosition] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  // Pointer position along the rail (0-1) while hovering or dragging.
  const [pointer, setPointer] = useState<number | null>(null)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const update = () => setRailHeight(rail.clientHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const items =
        listRef.current?.querySelectorAll<HTMLElement>('[data-item-index]')
      if (!items) return
      for (const element of items) {
        const rect = element.getBoundingClientRect()
        if (rect.bottom <= 1) continue
        const progress = clamp(-rect.top / (rect.height || 1), 0, 1)
        setPosition(Number(element.dataset.itemIndex) + progress)
        return
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const onScroll = () => {
      schedule()
      setIsScrolling(true)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(
        () => setIsScrolling(false),
        IDLE_MS,
      )
    }
    schedule()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      window.clearTimeout(idleTimer.current)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [listRef, itemCount])

  const monthIndexAt = useCallback(
    (index: number) => {
      let low = 0
      let high = months.length - 1
      while (low < high) {
        const mid = (low + high + 1) >> 1
        if (months[mid].itemIndex <= index) low = mid
        else high = mid - 1
      }
      return low
    },
    [months],
  )

  const indexAtFraction = (fraction: number) =>
    clamp(Math.floor(fraction * itemCount), 0, itemCount - 1)

  const marks = useMemo(() => {
    const years: { key: number; label: string; y: number }[] = []
    const dots: { key: number; y: number }[] = []
    let lastYear: number | undefined
    let lastLabelY = -Infinity
    let lastDotY = -Infinity
    for (const month of months) {
      const y = (month.itemIndex / itemCount) * railHeight
      const startsYear = month.year !== undefined && month.year !== lastYear
      if (month.year !== undefined) lastYear = month.year
      if (startsYear && y - lastLabelY >= MIN_YEAR_GAP) {
        years.push({ key: month.key, label: String(month.year), y })
        lastLabelY = y
        lastDotY = y
      } else if (y - lastDotY >= MIN_MONTH_GAP && y - lastLabelY >= 12) {
        dots.push({ key: month.key, y })
        lastDotY = y
      }
    }
    return { years, dots }
  }, [months, itemCount, railHeight])

  const fractionAt = (event: PointerEvent) => {
    const rect = railRef.current!.getBoundingClientRect()
    return clamp((event.clientY - rect.top) / (rect.height || 1), 0, 1)
  }

  const seekTo = (fraction: number) => {
    const index = indexAtFraction(fraction)
    if (index === lastSeek.current) return
    lastSeek.current = index
    onSeek(index)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const fraction = fractionAt(event)
    setIsDragging(true)
    setPointer(fraction)
    seekTo(fraction)
  }

  const onPointerMove = (event: PointerEvent) => {
    const fraction = fractionAt(event)
    setPointer(fraction)
    if (isDragging) seekTo(fraction)
  }

  const onPointerUp = () => {
    setIsDragging(false)
    lastSeek.current = undefined
  }

  const currentMonth = clamp(monthIndexAt(position), 0, months.length - 1)

  const onKeyDown = (event: KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
      PageDown: 12,
      PageUp: -12,
    }
    let target: number
    if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = months.length - 1
    else if (event.key in steps)
      target = clamp(currentMonth + steps[event.key], 0, months.length - 1)
    else return
    event.preventDefault()
    onSeek(months[target].itemIndex)
  }

  const scrollFraction = position / itemCount
  const bubbleFraction = pointer ?? scrollFraction
  const bubbleMonth =
    months[
      pointer === null
        ? currentMonth
        : monthIndexAt(indexAtFraction(bubbleFraction))
    ]
  const isActive = pointer !== null || isScrolling || isFocused
  const handleY = (isDragging ? bubbleFraction : scrollFraction) * railHeight

  return (
    <div
      className={`${styles.timeline} ${isActive ? styles.active : ''} ${className ?? ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Timeline"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={months.length - 1}
      aria-valuenow={currentMonth}
      aria-valuetext={months[currentMonth].label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => !isDragging && setPointer(null)}
      onKeyDown={onKeyDown}
      onFocus={(event) =>
        setIsFocused(event.currentTarget.matches(':focus-visible'))
      }
      onBlur={() => setIsFocused(false)}
    >
      <div ref={railRef} className={styles.rail}>
        {marks.dots.map((dot) => (
          <span
            key={dot.key}
            className={styles.dot}
            style={{ top: dot.y }}
            aria-hidden="true"
          />
        ))}
        {marks.years.map((year) => (
          <span
            key={year.key}
            className={styles.year}
            style={{ top: year.y }}
            aria-hidden="true"
          >
            {year.label}
          </span>
        ))}
        <span
          className={styles.handle}
          style={{ top: handleY }}
          aria-hidden="true"
        />
        <span
          className={styles.bubble}
          style={{ top: bubbleFraction * railHeight }}
          aria-hidden="true"
        >
          {bubbleMonth.label}
        </span>
      </div>
    </div>
  )
}
