export const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models'

export const FACE_MODEL = `${MODEL_BASE}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`

export const OBJECT_MODEL = `${MODEL_BASE}/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`

export const CLASSIFIER_MODEL = `${MODEL_BASE}/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite`

/** Analysed images are scaled down so large photos stay quick and light on memory. */
export const MAX_SIDE = 1280

export const QUERY_OPTIONS = {
  staleTime: Infinity,
  gcTime: 1000 * 60 * 5,
  retry: false,
  meta: { persist: false },
} as const
