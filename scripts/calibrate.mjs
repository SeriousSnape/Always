// Supabase에 모인 측정값으로 판정 기준을 다시 계산한다.
// 사용법 (둘 중 하나):
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/calibrate.mjs
//   node scripts/calibrate.mjs <calibration_samples 를 내보낸 CSV>   (Supabase 표 편집기 → Export → CSV)
// 서비스 키는 표를 읽는 관리자 키다. 저장소·브라우저에 넣지 말고 실행할 때만 환경 변수로 준다.
// 결과: 지표별 인원·평균·표준편차·사분위, 남녀별 값, 반복성(ICC), 그리고 physiognomy.js BASE 에 붙일 값
import { readFileSync } from 'node:fs';
import { parseCsv, calibrate } from '../src/lib/calibration.js';
import { BASE } from '../src/lib/physiognomy.js';

const src = process.argv[2];
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;

async function fromSupabase() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/calibration_samples?select=device,gender,metrics,v&order=id`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

let raw;
if (SUPABASE_URL && KEY && !src) raw = await fromSupabase();
else if (src) raw = parseCsv(readFileSync(src, 'utf8'));
else {
  console.error('사용법: SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 환경 변수, 또는 node scripts/calibrate.mjs <내보낸 CSV>');
  process.exit(1);
}
// metrics(이름:값 JSON)를 펼쳐서 지표 열로 만든다
const rows = raw
  .filter((r) => String(r.v) === '2')
  .map((r) => {
    const m = typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics;
    return { device: r.device, gender: r.gender, ...Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, v === null ? '' : String(v)])) };
  });
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
