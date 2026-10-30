import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react"

interface LazyImageProps {
  src: string
  alt: string
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"]
}

const options = {
  root: null,
  rootMargin: "0px",
  threshold: 0.1
}

export function LazyImage({ src, alt, referrerPolicy }: LazyImageProps) {
  const ref = useRef<HTMLImageElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      })
    }

    const observer = new IntersectionObserver(callback, options)
    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <img
      src={isVisible ? src : undefined}
      alt={alt}
      ref={ref}
      referrerPolicy={referrerPolicy}
    />
  )
}
