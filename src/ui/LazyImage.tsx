import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from 'react'
import {
  LAZY_IMAGE_MAX_RETRIES,
  LAZY_IMAGE_OBSERVER_OPTIONS,
  LAZY_IMAGE_RETRY_MS,
} from './constants'

interface LazyImageProps {
  src: string
  alt: string
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy']
  /** Called once, the first time loading the image fails. */
  onFail?: () => void
}

type Load = 'waiting' | 'near' | 'above-fold'

/**
 * Images on screen when they mount load right away with high priority; the
 * others wait until they are close to the viewport.
 */
export function LazyImage({
  src,
  alt,
  referrerPolicy,
  onFail,
}: LazyImageProps) {
  const ref = useRef<HTMLImageElement | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const failed = useRef(false)
  const [load, setLoad] = useState<Load>('waiting')
  const [attempt, setAttempt] = useState(0)

  // Before paint, so the first screen never waits for the observer's callback.
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (
      rect &&
      rect.bottom >= 0 &&
      rect.top < window.innerHeight &&
      rect.right >= 0 &&
      rect.left < window.innerWidth
    )
      setLoad('above-fold')
  }, [])

  useEffect(() => {
    if (load !== 'waiting') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setLoad('near')
        observer.disconnect()
      }
    }, LAZY_IMAGE_OBSERVER_OPTIONS)
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [load])

  useEffect(() => () => clearTimeout(retryTimer.current), [])

  // A failed request (rate limit, flaky network) would leave a blank tile, since
  // an empty alt shows no broken-image icon.
  function retry() {
    // The link itself may be bad, so the owner can start fetching a new one
    // while the same URL is retried.
    if (!failed.current) onFail?.()
    failed.current = true
    if (attempt >= LAZY_IMAGE_MAX_RETRIES) return
    retryTimer.current = setTimeout(
      () => setAttempt(attempt + 1),
      LAZY_IMAGE_RETRY_MS * (attempt + 1),
    )
  }

  return (
    <img
      key={attempt}
      src={load === 'waiting' ? undefined : src}
      alt={alt}
      ref={ref}
      referrerPolicy={referrerPolicy}
      fetchPriority={load === 'above-fold' ? 'high' : undefined}
      decoding="async"
      onError={retry}
    />
  )
}
