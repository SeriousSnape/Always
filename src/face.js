// 브라우저 안에서만 얼굴 랜드마크와 머리카락 영역을 추출한다. 사진은 서버로 전송되지 않는다.
import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import { analyzeForehead } from './lib/forehead.js';
import { measureComplexion } from './lib/complexion.js';

const BASE = import.meta.env.BASE_URL;
let filesetPromise = null;
let landmarkerPromise = null;
let segmenterPromise = null;

const fileset = () => (filesetPromise ??= FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`));

export function loadLandmarker() {
  landmarkerPromise ??= fileset().then((fs) =>
    FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: `${BASE}mediapipe/face_landmarker.task` },
      runningMode: 'IMAGE',
      numFaces: 2,
      outputFaceBlendshapes: true,
    }),
  );
  return landmarkerPromise;
}

function loadSegmenter() {
  segmenterPromise ??= fileset().then((fs) =>
    ImageSegmenter.createFromOptions(fs, {
      baseOptions: { modelAssetPath: `${BASE}mediapipe/hair_segmenter.tflite` },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    }),
  );
  return segmenterPromise;
}

/** @returns {Promise<{landmarks:{x:number,y:number,z:number}[], faces:number, expression:{smile:number,jawOpen:number}}|null>} */
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

/** 이마가 드러났는지 보고, 드러났으면 머리선 기준 삼정 비율을 구한다 */
export async function foreheadOf(canvas, landmarks) {
  try {
    const seg = await loadSegmenter();
    const res = seg.segment(canvas);
    const m = res.categoryMask;
    const out = analyzeForehead(m.getAsUint8Array(), m.width, m.height, landmarks);
    res.close();
    return out;
  } catch (err) {
    console.error(err);
    return { status: 'unclear', reason: '이마를 분석하지 못했어요', thirds: null };
  }
}

/** 기색: 같은 사진 안에서 부위 빛깔을 두 뺨과 비교 (점을 그리기 전에 호출) */
export function complexionOf(canvas, landmarks, forehead) {
  try {
    const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    return measureComplexion(img, landmarks, forehead);
  } catch (err) {
    console.error(err);
    return null;
  }
}
