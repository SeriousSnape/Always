// MediaPipe wasm과 얼굴 랜드마크 모델을 public/에 준비한다 (CDN 의존 없이 자체 호스팅).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/mediapipe';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

mkdirSync(OUT, { recursive: true });
cpSync('node_modules/@mediapipe/tasks-vision/wasm', `${OUT}/wasm`, { recursive: true });

const model = `${OUT}/face_landmarker.task`;
if (!existsSync(model)) {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`모델 다운로드 실패: ${res.status}`);
  writeFileSync(model, Buffer.from(await res.arrayBuffer()));
  console.log('face_landmarker.task 다운로드 완료');
}
