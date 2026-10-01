// 브라우저 안에서만 얼굴 랜드마크를 추출한다. 사진은 서버로 전송되지 않는다.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const BASE = import.meta.env.BASE_URL;
let landmarkerPromise = null;

export function loadLandmarker() {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${BASE}mediapipe/face_landmarker.task` },
      runningMode: 'IMAGE',
      numFaces: 2,
      outputFaceBlendshapes: true,
    });
  })();
  return landmarkerPromise;
}

/** @returns {Promise<{landmarks:{x:number,y:number}[], faces:number, expression:{smile:number,jawOpen:number}}|null>} */
export async function detect(source) {
  const lm = await loadLandmarker();
  const res = lm.detect(source);
  if (!res.faceLandmarks.length) return null;
  const shapes = Object.fromEntries((res.faceBlendshapes[0]?.categories ?? []).map((c) => [c.categoryName, c.score]));
  const expression = {
    smile: ((shapes.mouthSmileLeft ?? 0) + (shapes.mouthSmileRight ?? 0)) / 2,
    jawOpen: shapes.jawOpen ?? 0,
  };
  return { landmarks: res.faceLandmarks[0], faces: res.faceLandmarks.length, expression };
}
