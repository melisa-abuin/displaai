import type { Detection } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'

const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models'
const FACE_MODEL = `${MODEL_BASE}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`
const OBJECT_MODEL = `${MODEL_BASE}/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`
const CLASSIFIER_MODEL = `${MODEL_BASE}/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite`

/** A region of an image; every coordinate is a 0-1 fraction of the image's size. */
export interface Region {
  x: number
  y: number
  width: number
  height: number
  score: number
  label?: string
}

export interface Label {
  name: string
  score: number
}

export interface FaceAnalysis {
  /** Natural size of the analysed image. */
  width: number
  height: number
  faces: Region[]
}

export interface SceneAnalysis {
  objects: Region[]
  labels: Label[]
}

/** Creates something expensive once; a failure is not cached, so the next call retries. */
function lazy<T>(create: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined
  return () => {
    promise ??= create().catch((error: unknown) => {
      promise = undefined
      throw error
    })
    return promise
  }
}

// Loaded on first use so the library, Wasm and models stay out of the initial page load.
const getVision = lazy(() => import('@mediapipe/tasks-vision'))
const fileset = { wasmLoaderPath, wasmBinaryPath }

const baseOptions = (modelAssetPath: string) => ({
  modelAssetPath,
  delegate: 'CPU' as const,
})

const getFaceDetector = lazy(async () =>
  (await getVision()).FaceDetector.createFromOptions(fileset, {
    baseOptions: baseOptions(FACE_MODEL),
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  }),
)

const getObjectDetector = lazy(async () =>
  (await getVision()).ObjectDetector.createFromOptions(fileset, {
    baseOptions: baseOptions(OBJECT_MODEL),
    runningMode: 'IMAGE',
    scoreThreshold: 0.4,
    maxResults: 12,
  }),
)

const getClassifier = lazy(async () =>
  (await getVision()).ImageClassifier.createFromOptions(fileset, {
    baseOptions: baseOptions(CLASSIFIER_MODEL),
    runningMode: 'IMAGE',
    scoreThreshold: 0.1,
    maxResults: 6,
  }),
)

// The models run on the main thread, so analyses go one at a time.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const result = queue.then(() => {
    signal?.throwIfAborted()
    return job()
  })
  queue = result.catch(() => undefined)
  return result
}

/** Analysed images are scaled down so large photos stay quick and light on memory. */
const MAX_SIDE = 1280

/** Browsers can't decode HEIC, so the fallback decoder is loaded only when needed. */
export async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    try {
      const { heicTo } = await import('heic-to')
      return await heicTo({ blob, type: 'bitmap' })
    } catch {
      throw new Error('This image format cannot be decoded')
    }
  }
}

/** Decodes the photo upright and scaled down. */
async function decode(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await toBitmap(blob)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

/** Fetches the photo's bytes; each job loads its own so only one image is in flight at a time. */
export type PhotoSource = () => Promise<Blob>

function toRegions(
  detections: Detection[],
  img: HTMLCanvasElement,
  withLabel: boolean,
): Region[] {
  const { width: w, height: h } = img
  return detections.flatMap(({ boundingBox, categories }) => {
    if (!boundingBox) return []
    const top = categories[0]
    return [
      {
        x: boundingBox.originX / w,
        y: boundingBox.originY / h,
        width: boundingBox.width / w,
        height: boundingBox.height / h,
        score: top?.score ?? 0,
        label: withLabel ? top?.categoryName : undefined,
      },
    ]
  })
}
export function detectFaces(
  source: PhotoSource,
  signal?: AbortSignal,
): Promise<FaceAnalysis> {
  return enqueue(async () => {
    const [img, detector] = await Promise.all([
      source().then(decode),
      getFaceDetector(),
    ])
    const { detections } = detector.detect(img)
    return {
      width: img.width,
      height: img.height,
      faces: toRegions(detections, img, false),
    }
  }, signal)
}

export function analyzeScene(
  source: PhotoSource,
  signal?: AbortSignal,
): Promise<SceneAnalysis> {
  return enqueue(async () => {
    const [img, objectDetector, classifier] = await Promise.all([
      source().then(decode),
      getObjectDetector(),
      getClassifier(),
    ])
    const { detections } = objectDetector.detect(img)
    const { classifications } = classifier.classify(img)
    return {
      objects: toRegions(detections, img, true),
      labels: (classifications[0]?.categories ?? []).map((c) => ({
        name: c.categoryName || c.displayName,
        score: c.score,
      })),
    }
  }, signal)
}
