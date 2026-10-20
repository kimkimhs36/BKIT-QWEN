import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
export async function createFaceEngine() {
  const base = import.meta.env.BASE_URL + 'awake/';
  const files = await FilesetResolver.forVisionTasks(base + 'wasm');
  return FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: base + 'face_landmarker.task', delegate: 'CPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.65,
    minFacePresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });
}
