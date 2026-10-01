// MediaPipe wasm과 모델(얼굴 랜드마크, 머리카락 분할)을 public/에 준비한다 (CDN 의존 없이 자체 호스팅).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/mediapipe';
const MODELS = {
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'hair_segmenter.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite',
};

mkdirSync(OUT, { recursive: true });
cpSync('node_modules/@mediapipe/tasks-vision/wasm', `${OUT}/wasm`, { recursive: true });

for (const [name, url] of Object.entries(MODELS)) {
  const file = `${OUT}/${name}`;
  if (existsSync(file)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} 다운로드 실패: ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`${name} 다운로드 완료`);
}
