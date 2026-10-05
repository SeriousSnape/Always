// 구글 시트에 모인 측정값으로 판정 기준을 다시 계산한다.
// 사용법: node scripts/calibrate.mjs <CSV 파일 경로 또는 CSV 주소>
//   (구글 시트 → 파일 → 다운로드 → CSV, raw 시트)
// 결과: 지표별 인원·평균·표준편차·사분위, 남녀별 값, 반복성(ICC), 그리고 physiognomy.js BASE 에 붙일 값
import { readFileSync } from 'node:fs';
import { parseCsv, calibrate } from '../src/lib/calibration.js';
import { BASE } from '../src/lib/physiognomy.js';

const src = process.argv[2];
if (!src) {
  console.error('사용법: node scripts/calibrate.mjs <raw.csv 또는 CSV 주소>');
  process.exit(1);
}
const text = /^https?:/.test(src) ? await (await fetch(src)).text() : readFileSync(src, 'utf8');
const rows = parseCsv(text).filter((r) => r.v === '1');
const devices = new Set(rows.map((r) => r.device));
const res = calibrate(rows, Object.keys(BASE));

const f = (x) => (x === undefined || x === null || Number.isNaN(x) ? '-' : x.toFixed(4));
console.log(`행 ${rows.length}개 · 사람(기기) ${devices.size}명\n`);
console.log('지표\t인원\t평균\t표준편차\t25%\t75%\t남 평균\t여 평균\t반복성(ICC)');
for (const [k, r] of Object.entries(res)) {
  const a = r.all;
  const icc = r.repeat ? `${r.repeat.icc.toFixed(2)} (${r.repeat.people}명)${r.repeat.icc < 0.5 ? ' ⚠ 사람 구별 못 함' : ''}` : '-';
  console.log([k, a?.n ?? 0, f(a?.mean), f(a?.sd), f(a?.p25), f(a?.p75), f(r.m?.mean), f(r.f?.mean), icc].join('\t'));
}

console.log('\n// physiognomy.js BASE 에 붙일 값 (전체 기준, 30명 미만인 지표는 기존 값 유지)');
console.log('export const BASE = {');
for (const [k, r] of Object.entries(res)) {
  const ok = r.all && r.all.n >= 30;
  const [mu, sd] = ok ? [r.all.mean, r.all.sd] : BASE[k];
  console.log(`  ${k}: [${+mu.toFixed(4)}, ${+sd.toFixed(4)}],${ok ? '' : ' // 표본 부족, 기존 값'}`);
}
console.log('};');
