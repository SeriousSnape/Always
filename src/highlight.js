// 부위 색칠 그림 — 해설이 말하는 자리를 내 얼굴 비율 그림 위에 칠한다.
// 위치는 麻衣 p7 十二宮分之圖 · p6 流年運氣部位圖를 따른다(chart.js 와 같은 기준).
import { faceGeometry, drawFace, COLOR } from './chart.js';

const FILL = { good: '#d9a034', mid: '#a89a86', bad: '#d0503a' };
const SANS = 'font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"';

const ell = (x, y, rx, ry, rot = 0) =>
  `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"${rot ? ` transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}/>`;

/** 부위 → 모양(여러 개면 좌우) + 이름표 기준점 */
function regions(g) {
  const { cx, W, yHair, browY, noseBaseY, chinY, eW, eyeGap, eyeH, eyeY, browIn, browLen, fw, jw, nw, mw, lipTopY, mouthY, tilt } = g;
  const fore = (k) => yHair + (browY - yHair) * k;
  const both = (f) => [f(1), f(-1)].join('');
  const eyeX = eyeGap / 2 + eW / 2;
  const cheekY = eyeY + (noseBaseY - eyeY) * 0.5;
  const chinTop = mouthY + (chinY - mouthY) * 0.35;
  const R = {
    myung: { d: ell(cx, browY + 2, Math.max(browIn * 0.85, 9), 11), at: [cx, browY + 2] },
    hyungje: { d: both((s) => ell(cx + s * (browIn + browLen / 2), browY - 2, browLen / 2 + 6, 10)), at: [cx + browIn + browLen / 2, browY - 2] },
    jeontaek: { d: both((s) => ell(cx + s * eyeX, eyeY - 1, eW / 2 + 6, eyeH + 4)), at: [cx + eyeX, eyeY] },
    namnyeo: { d: both((s) => ell(cx + s * eyeX, eyeY + eyeH + 9, eW / 2, 8)), at: [cx + eyeX, eyeY + eyeH + 9] },
    cheocheop: { d: both((s) => ell(cx + s * (eyeGap / 2 + eW + 12), eyeY - tilt, 10, 13)), at: [cx + eyeGap / 2 + eW + 12, eyeY] },
    jilaek: { d: ell(cx, eyeY - 2, 9, 13), at: [cx, eyeY] },
    jaebaek: { d: ell(cx, noseBaseY - 11, nw / 2 + 4, 15), at: [cx, noseBaseY - 11] },
    simbyeon: { d: `<path d="M${cx - 9},${eyeY} L${cx + 9},${eyeY} L${cx + nw / 2 + 5},${noseBaseY - 4} Q${cx},${noseBaseY + 8} ${cx - nw / 2 - 5},${noseBaseY - 4} Z"/>`, at: [cx, (eyeY + noseBaseY) / 2] },
    cheoni: { d: both((s) => ell(cx + s * fw * 0.38, fore(0.55), 19, 24)), at: [cx + fw * 0.38, fore(0.55)] },
    gwanrok: { d: ell(cx, fore(0.62), 26, 20), at: [cx, fore(0.62)] },
    bumo: { d: both((s) => ell(cx + s * fw * 0.2, fore(0.3), 18, 14)), at: [cx + fw * 0.2, fore(0.3)] },
    namak: { d: `<path d="M${cx - fw / 2 + 8},${browY - 12} Q${cx - fw / 2 + 2},${yHair + 18} ${cx},${yHair + 6} Q${cx + fw / 2 - 2},${yHair + 18} ${cx + fw / 2 - 8},${browY - 12} Z"/>`, at: [cx, fore(0.45)] },
    dongseo: { d: both((s) => ell(cx + s * (W / 2 - 26), cheekY, 22, 17)), at: [cx + W / 2 - 26, cheekY] },
    chulnap: { d: ell(cx, mouthY, mw / 2 + 6, 13), at: [cx, mouthY] },
    injung: { d: ell(cx, (noseBaseY + lipTopY) / 2 + 1, 8, (lipTopY - noseBaseY) / 2 + 2), at: [cx, (noseBaseY + lipTopY) / 2] },
    nobok: { d: ell(cx, chinY - 13, jw * 0.22, 13), at: [cx, chinY - 13] },
    bukak: { d: `<path d="M${cx - jw * 0.38},${chinTop} Q${cx},${chinTop - 6} ${cx + jw * 0.38},${chinTop} Q${cx + W * 0.2},${chinY - 4} ${cx},${chinY + 2} Q${cx - W * 0.2},${chinY - 4} ${cx - jw * 0.38},${chinTop} Z"/>`, at: [cx, (chinTop + chinY) / 2] },
  };
  R.gamchal = R.jeontaek;
  R.bosu = R.hyungje;
  R.jungak = R.simbyeon;
  R.bokdeok = { d: R.cheoni.d + R.nobok.d, at: R.cheoni.at };
  // 삼정은 세 띠로
  // 삼정은 얼굴 왼쪽 옆의 세 막대로(얼굴을 덮지 않게)
  const bx = cx - W / 2 - 22;
  const bands = [
    ['상정', yHair + 4, browY - 2],
    ['중정', browY + 2, noseBaseY - 2],
    ['하정', noseBaseY + 2, chinY],
  ];
  R.thirds = {
    d: bands.map(([, y0, y1]) => `<rect x="${bx}" y="${y0}" width="8" height="${y1 - y0}" rx="4"/>`).join(''),
    at: [bx, (browY + noseBaseY) / 2],
    bands: bands.map(([name, y0, y1]) => [name, (y0 + y1) / 2, bx - 6]),
  };
  R.sangmo = { d: `<rect x="${cx - W / 2 - 4}" y="${yHair}" width="${W + 8}" height="${chinY - yHair + 6}"/>`, at: [cx, eyeY] };
  return R;
}

// 유년운기 자리 이름 → 부위
const ZONE_REGION = [
  [/눈썹/, 'hyungje'], [/눈\(|^눈/, 'jeontaek'], [/산근/, 'jilaek'], [/인당/, 'myung'], [/광대|관골/, 'dongseo'],
  [/준두|코/, 'jaebaek'], [/인중/, 'injung'], [/입|수성/, 'chulnap'], [/지각|턱/, 'bukak'], [/이마|천중|천정|사공|중정/, 'namak'],
];
export const zoneRegion = (area) => ZONE_REGION.find(([re]) => re.test(area))?.[1] ?? null;

/**
 * @param {object} metrics 측정 비율
 * @param {Array<{region:string, grade:'good'|'mid'|'bad', label?:string}>} marks
 * @param {{crop?: 'face'|'auto', clipId?: string}} opts
 */
export function buildHighlight(metrics, marks, { clipId = 'hl' } = {}) {
  const g = faceGeometry(metrics);
  const R = regions(g);
  const top = g.yHair - 14;
  const bottom = g.chinY + 22;
  const Wv = 400;
  const outlineClip = `<clipPath id="${clipId}"><rect x="${g.cx - g.W / 2 - 30}" y="${top}" width="${g.W + 60}" height="${bottom - top}"/></clipPath>`;
  const layers = [];
  const labels = [];
  const used = new Set();
  for (const mk of marks) {
    const r = R[mk.region];
    if (!r) continue;
    const big = mk.region === 'sangmo';
    const target = r.bands ? labels : layers; // 삼정 막대는 얼굴 밖이라 잘리지 않게
    target.push(`<g fill="${FILL[mk.grade]}" fill-opacity="${big ? 0.18 : r.bands ? 0.9 : 0.55}" stroke="${FILL[mk.grade]}" stroke-width="2">${r.d}</g>`);
    if (r.bands) {
      for (const [name, y, x] of r.bands) labels.push(tag(x, y, name, FILL[mk.grade], 'end'));
    } else if (mk.label && !used.has(mk.label)) {
      used.add(mk.label);
      const right = r.at[0] >= g.cx;
      const x = right ? g.cx + g.W / 2 + 10 : g.cx - g.W / 2 - 10;
      labels.push(`<line x1="${r.at[0].toFixed(1)}" y1="${r.at[1].toFixed(1)}" x2="${x}" y2="${r.at[1].toFixed(1)}" stroke="${FILL[mk.grade]}" stroke-width="1.5"/>`);
      labels.push(tag(x + (right ? 2 : -2), r.at[1], mk.label, FILL[mk.grade], right ? 'start' : 'end'));
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${Wv} ${bottom - top}" role="img">
    <defs>${outlineClip}</defs>
    ${drawFace(g)}
    <g clip-path="url(#${clipId})" style="mix-blend-mode:multiply">${layers.join('')}</g>
    ${labels.join('')}
  </svg>`;
  return { svg, width: Wv, height: bottom - top };
}

function tag(x, y, text, color, anchor) {
  return `<text x="${x.toFixed(1)}" y="${(y + 0.5).toFixed(1)}" ${SANS} font-size="12.5" font-weight="800" fill="${color}" text-anchor="${anchor}" dominant-baseline="central" paint-order="stroke" stroke="${COLOR.paper}" stroke-width="4">${text}</text>`;
}
