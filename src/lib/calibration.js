// 구글 시트에 모인 측정값으로 판정 기준(BASE)을 다시 계산한다. scripts/calibrate.mjs 에서 쓴다.

/** 간단한 CSV 파서 (따옴표 지원) */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const variance = (a) => {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1);
};
export function quantile(sorted, p) {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** 기기별로 묶는다 — 한 사람이 여러 번 보내도 분포에는 한 번만 반영 */
function byDevice(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const x = Number(r[key]);
    if (r[key] === '' || !Number.isFinite(x)) continue;
    if (!map.has(r.device)) map.set(r.device, { gender: r.gender, xs: [] });
    map.get(r.device).xs.push(x);
  }
  return [...map.values()];
}

/** 반복성: 같은 기기(사람)의 여러 측정 간 흔들림 대비 사람 간 차이 (ICC(1)) */
export function repeatability(groups) {
  const multi = groups.filter((g) => g.xs.length >= 2);
  if (multi.length < 3) return null;
  const within = mean(multi.map((g) => variance(g.xs)));
  const k = mean(multi.map((g) => g.xs.length));
  const between = Math.max(0, variance(multi.map((g) => mean(g.xs))) - within / k);
  return { icc: between / (between + within || 1), people: multi.length };
}

function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  return { n: s.length, mean: mean(s), sd: Math.sqrt(variance(s)), p25: quantile(s, 0.25), p50: quantile(s, 0.5), p75: quantile(s, 0.75) };
}

/**
 * @param {object[]} rows parseCsv 결과
 * @param {string[]} keys 지표 이름
 */
export function calibrate(rows, keys) {
  const out = {};
  for (const key of keys) {
    const groups = byDevice(rows, key);
    const all = groups.map((g) => mean(g.xs));
    const m = groups.filter((g) => g.gender === 'm').map((g) => mean(g.xs));
    const f = groups.filter((g) => g.gender === 'f').map((g) => mean(g.xs));
    out[key] = {
      all: all.length ? stats(all) : null,
      m: m.length ? stats(m) : null,
      f: f.length ? stats(f) : null,
      repeat: repeatability(groups),
    };
  }
  return out;
}
