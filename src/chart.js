// 관상도(觀相圖): 사진이 아니라 측정 비율(metrics)만으로 얼굴을 다시 그리고,
// 그 위에 십이궁 또는 유년운기 자리를 표시한다. 랜드마크 좌표나 사진은 쓰지 않는다.
import { BASE } from './lib/physiognomy.js';

const COLOR = {
  paper: '#f4ecdc',
  ink: '#2a2019',
  faint: '#8c7b64',
  skin: '#fbf5ea',
  good: '#b07a1c',
  mid: '#8a7c69',
  bad: '#b8452f',
  seal: '#b8322a',
  unread: '#c9bda9',
};
const GRADE_TEXT = { good: '길', mid: '평', bad: '흉', unread: '—' };
const FONT = 'font-family="Noto Serif KR, Nanum Myeongjo, AppleMyungjo, serif"';
const SANS = 'font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"';
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬'];

// 측정값을 기준 분포 ±2.5σ 안으로 묶어 그림이 깨지지 않게 한다
function v(m, k) {
  const [mu, sd] = BASE[k];
  const x = m[k] ?? mu;
  return Math.max(mu - 2.5 * sd, Math.min(mu + 2.5 * sd, x));
}

/** 측정 비율 → 그림 좌표 */
export function faceGeometry(m, cx = 200, top = 96) {
  const W = 220;
  const H = W * v(m, 'aspect');
  const yTop = top + H * 0.32; // 메시 맨 위(이마 가운데쯤). 그 위로 머리선까지 이마를 이어 그린다
  const yHair = top;
  const browY = yTop + v(m, 'upper') * H;
  const noseBaseY = browY + v(m, 'middle') * H;
  const chinY = noseBaseY + v(m, 'lower') * H;
  const eW = W * v(m, 'eyeSize');
  const eyeGap = v(m, 'eyeGap') * eW;
  const eyeH = eW * 0.36;
  const lidY = browY + v(m, 'browEye') * eW * 0.9 + 6;
  const eyeY = lidY + eyeH / 2;
  const tilt = v(m, 'eyeTilt') * eW;
  const browIn = (v(m, 'browGap') * eW) / 2;
  const browLen = v(m, 'browLen') * eW * 0.92;
  const fw = W * v(m, 'foreheadW');
  const jw = W * v(m, 'jaw');
  const nw = W * v(m, 'noseWidth');
  const mw = W * v(m, 'mouthWidth');
  const lipTopY = noseBaseY + v(m, 'philtrum') * H * 1.6;
  const lip = v(m, 'lipThickness') * mw;
  const mouthY = lipTopY + lip * 0.45;
  return { cx, W, H, yHair, yTop, browY, noseBaseY, chinY, eW, eyeGap, eyeH, lidY, eyeY, tilt, browIn, browLen, fw, jw, nw, mw, lipTopY, lip, mouthY };
}

// 닫힌 Catmull-Rom 곡선 → 베지어 경로
function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

function drawFace(g) {
  const { cx, W, yHair, browY, noseBaseY, chinY, eW, eyeGap, eyeH, eyeY, tilt, browIn, browLen, fw, jw, nw, mw, lipTopY, lip, mouthY } = g;
  const cheekY = eyeY + (noseBaseY - eyeY) * 0.45;
  const jawY = mouthY + (chinY - mouthY) * 0.25;
  const outline = smoothClosed([
    [cx, yHair],
    [cx + fw * 0.36, yHair + 8],
    [cx + fw / 2, yHair + (browY - yHair) * 0.5],
    [cx + W / 2, cheekY],
    [cx + jw / 2, jawY],
    [cx + W * 0.2, chinY - 14],
    [cx, chinY],
    [cx - W * 0.2, chinY - 14],
    [cx - jw / 2, jawY],
    [cx - W / 2, cheekY],
    [cx - fw / 2, yHair + (browY - yHair) * 0.5],
    [cx - fw * 0.36, yHair + 8],
  ]);
  const parts = [`<path d="${outline}" fill="${COLOR.skin}" stroke="${COLOR.ink}" stroke-width="2.2"/>`];

  for (const s of [1, -1]) {
    // 눈썹
    const bx0 = cx + s * browIn;
    const bx1 = cx + s * (browIn + browLen);
    parts.push(
      `<path d="M${bx0},${browY + 3} Q${(bx0 + bx1) / 2},${browY - 8} ${bx1},${browY + 2}" fill="none" stroke="${COLOR.ink}" stroke-width="5" stroke-linecap="round"/>`,
    );
    // 눈 (바깥 꼬리는 tilt만큼 올라감)
    const ex0 = cx + s * (eyeGap / 2);
    const ex1 = cx + s * (eyeGap / 2 + eW);
    const ey1 = eyeY - tilt;
    const mx = (ex0 + ex1) / 2;
    parts.push(
      `<path d="M${ex0},${eyeY} Q${mx},${eyeY - eyeH * 1.1} ${ex1},${ey1} Q${mx},${eyeY + eyeH * 0.9} ${ex0},${eyeY} Z" fill="#fff" stroke="${COLOR.ink}" stroke-width="1.8"/>`,
      `<circle cx="${mx}" cy="${(eyeY + ey1) / 2 - 1}" r="${eyeH * 0.38}" fill="${COLOR.ink}"/>`,
    );
  }
  // 코: 콧대 두 줄과 콧방울
  parts.push(
    `<path d="M${cx - 7},${eyeY + 2} Q${cx - 9},${(eyeY + noseBaseY) / 2} ${cx - nw * 0.28},${noseBaseY - 14}" fill="none" stroke="${COLOR.faint}" stroke-width="1.4"/>`,
    `<path d="M${cx - nw / 2 + 4},${noseBaseY - 14} Q${cx - nw / 2 - 4},${noseBaseY - 2} ${cx - nw * 0.2},${noseBaseY - 1}" fill="none" stroke="${COLOR.ink}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M${cx + nw / 2 - 4},${noseBaseY - 14} Q${cx + nw / 2 + 4},${noseBaseY - 2} ${cx + nw * 0.2},${noseBaseY - 1}" fill="none" stroke="${COLOR.ink}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M${cx - nw * 0.2},${noseBaseY - 1} Q${cx},${noseBaseY + 4} ${cx + nw * 0.2},${noseBaseY - 1}" fill="none" stroke="${COLOR.ink}" stroke-width="1.4"/>`,
  );
  // 인중
  parts.push(`<path d="M${cx - 5},${noseBaseY + 4} L${cx - 6},${lipTopY} M${cx + 5},${noseBaseY + 4} L${cx + 6},${lipTopY}" stroke="${COLOR.faint}" stroke-width="1"/>`);
  // 입술
  const up = lip * 0.45;
  const lo = lip * 0.55;
  parts.push(
    `<path d="M${cx - mw / 2},${mouthY} Q${cx - mw / 4},${lipTopY - 1} ${cx - 4},${lipTopY} L${cx},${lipTopY + 2} L${cx + 4},${lipTopY} Q${cx + mw / 4},${lipTopY - 1} ${cx + mw / 2},${mouthY} Q${cx},${mouthY + up * 0.2} ${cx - mw / 2},${mouthY} Z" fill="#e7b9a8" stroke="${COLOR.ink}" stroke-width="1.4"/>`,
    `<path d="M${cx - mw / 2},${mouthY} Q${cx},${mouthY + lo * 2.2} ${cx + mw / 2},${mouthY}" fill="#dca592" stroke="${COLOR.ink}" stroke-width="1.4"/>`,
  );
  // 삼정 구분선
  for (const y of [browY, noseBaseY]) {
    parts.push(`<line x1="${cx - W / 2 - 18}" y1="${y}" x2="${cx + W / 2 + 18}" y2="${y}" stroke="${COLOR.faint}" stroke-width="0.8" stroke-dasharray="3 4"/>`);
  }
  return parts.join('');
}

// 자리 표시는 麻衣 p7 十二宮分之圖, p6 流年運氣部位圖의 위치를 따른다
function palaceSpots(g) {
  const { cx, yHair, browY, eyeY, eyeH, eW, eyeGap, noseBaseY, chinY, browIn, browLen, fw, tilt } = g;
  const foreY = (k) => yHair + (browY - yHair) * k;
  const both = (dx, y) => [[cx + dx, y], [cx - dx, y]];
  return {
    myung: [[cx, browY + 2]],
    jaebaek: [[cx, noseBaseY - 12]],
    hyungje: both(browIn + browLen / 2, browY - 4),
    jeontaek: both(eyeGap / 2 + eW / 2, eyeY - 1),
    namnyeo: both(eyeGap / 2 + eW / 2, eyeY + eyeH + 8),
    nobok: [[cx, chinY - 12]],
    cheocheop: both(eyeGap / 2 + eW + 13, eyeY - tilt),
    jilaek: [[cx, eyeY]],
    cheoni: both(fw * 0.4, foreY(0.55)),
    gwanrok: [[cx, foreY(0.62)]],
    bokdeok: both(browIn + browLen + 4, browY - 22),
    sangmo: [],
    bumo: both(fw * 0.2, foreY(0.3)),
  };
}

function zoneSpots(g) {
  const { cx, W, yHair, browY, eyeY, eW, eyeGap, eyeH, noseBaseY, lipTopY, chinY, browIn, browLen, fw, jw, nw, mw, mouthY } = g;
  const foreY = (k) => yHair + (browY - yHair) * k;
  const both = (dx, y) => [[cx + dx, y], [cx - dx, y]];
  const jawY = mouthY + (chinY - mouthY) * 0.25;
  return {
    1: both(W / 2 + 12, eyeY + 10),
    15: [[cx, foreY(0.1)]],
    16: [[cx, foreY(0.26)]],
    17: both(fw * 0.22, foreY(0.32)),
    19: [[cx, foreY(0.42)]],
    20: both(fw * 0.38, foreY(0.2)),
    22: [[cx, foreY(0.58)]],
    23: both(fw * 0.46, foreY(0.42)),
    25: [[cx, foreY(0.74)]],
    26: both(browIn + browLen * 0.7, foreY(0.82)),
    28: [[cx, browY + 2]],
    29: both(fw * 0.46, foreY(0.66)),
    31: both(browIn + browLen / 2, browY - 6),
    35: both(eyeGap / 2 + eW / 2, eyeY),
    41: [[cx, eyeY - 2]],
    42: both(eyeGap / 2 - 4, eyeY + eyeH + 4),
    44: [[cx, (eyeY + noseBaseY) / 2 + 2]],
    46: both(W * 0.3, (eyeY + noseBaseY) / 2 + 14),
    48: [[cx, noseBaseY - 10]],
    49: both(nw / 2 + 14, noseBaseY - 8),
    51: [[cx, (noseBaseY + lipTopY) / 2 + 1]],
    52: both(mw / 2 + 2, lipTopY - 6),
    56: both(mw / 2 + 20, lipTopY + 8),
    58: both(W / 2 - 4, lipTopY + 4),
    60: [[cx, mouthY + 1]],
    61: [[cx, mouthY + (chinY - mouthY) * 0.35]],
    62: both(mw / 2 - 2, mouthY + (chinY - mouthY) * 0.45),
    64: both(mw / 2 + 18, mouthY + 6),
    66: both(jw / 2 - 6, jawY),
    70: [],
    71: [[cx, chinY - 10]],
    72: both(jw / 2 - 26, mouthY + (chinY - mouthY) * 0.7),
    74: both(jw / 2 + 4, mouthY - 6),
    76: [[cx, chinY + 14]],
    100: [],
  };
}

const marker = (x, y, label, color, r = 10) =>
  `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" stroke="${COLOR.paper}" stroke-width="2"/><text x="${x.toFixed(1)}" y="${(y + 0.5).toFixed(1)}" ${SANS} font-size="${r > 10 ? 11 : 11}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${label}</text></g>`;

const pill = (x, y, label, color, highlight) => {
  const w = label.length * 5.4 + 8;
  return `<g><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="${w.toFixed(1)}" height="14" rx="7" fill="${color}" stroke="${highlight ? COLOR.ink : COLOR.paper}" stroke-width="${highlight ? 2.5 : 1}"/><text x="${x.toFixed(1)}" y="${(y + 0.5).toFixed(1)}" ${SANS} font-size="9" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${label}</text></g>`;
};

/**
 * @param {object} p
 * @param {object} p.metrics 측정 비율
 * @param {'palace'|'yearly'} p.mode
 * @param {ReturnType<import('./lib/reading.js').readFace>['palaces']} p.palaces
 * @param {ReturnType<import('./lib/reading.js').zoneGrades>} p.zones
 * @param {{year:number, age:number}|null} p.now 올해 (태어난 해를 고른 경우)
 */
export function buildFaceChart({ metrics, mode, palaces, zones, now, forehead = null }) {
  const Wv = 400;
  const g = faceGeometry(metrics);
  const faceBottom = g.chinY + 28;
  const parts = [drawFace(g)];
  if (forehead && forehead.status !== 'visible') {
    // 이마가 가려졌거나 머리선을 못 찾았으면 상정 자리를 빗금으로 덮는다
    const y0 = g.yHair;
    const y1 = g.browY - 14;
    parts.push(
      `<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" stroke="${COLOR.faint}" stroke-width="2"/></pattern></defs>`,
      `<rect x="${g.cx - g.fw / 2}" y="${y0}" width="${g.fw}" height="${y1 - y0}" rx="18" fill="url(#hatch)" opacity="0.55"/>`,
      `<text x="${g.cx}" y="${(y0 + y1) / 2}" ${SANS} font-size="11" font-weight="700" fill="${COLOR.ink}" text-anchor="middle" dominant-baseline="central" paint-order="stroke" stroke="${COLOR.paper}" stroke-width="4">상정 불명확 · 이마를 드러내야 봐요</text>`,
    );
  }
  const legend = [];
  const title = mode === 'palace' ? '십이궁도(十二宮圖)' : '유년운기도(流年運氣圖)';

  if (mode === 'palace') {
    const spots = palaceSpots(g);
    palaces.forEach((p, i) => {
      for (const [x, y] of spots[p.key] ?? []) parts.push(marker(x, y, i + 1, COLOR[p.grade]));
      legend.push({ text: `${CIRCLED[i]} ${p.name} · ${p.domain}`, grade: p.grade });
    });
  } else {
    const spots = zoneSpots(g);
    const current = now ? zones.find((z) => now.age >= z.from && now.age <= z.to) : null;
    for (const z of zones) {
      const label = z.from === z.to ? `${z.from}` : z.to > 99 ? `${z.from}+` : `${z.from}-${z.to}`;
      const hl = current === z;
      for (const [x, y] of spots[z.from] ?? []) parts.push(pill(x, y, label, COLOR[z.grade], hl));
    }
    if (current) {
      legend.push({ text: `▣ 올해 ${now.year}년 ${now.age}세 — ${current.area}`, grade: current.grade, strong: true });
    }
    const upcoming = zones.filter((z) => (now ? z.to >= now.age : true)).slice(current ? 1 : 0, current ? 5 : 6);
    for (const z of upcoming) {
      const range = z.from === z.to ? `${z.from}세` : z.to > 99 ? `${z.from}세~` : `${z.from}~${z.to}세`;
      legend.push({ text: `${range} ${z.area.replace(/\(.*\)/, '')}`, grade: z.grade });
    }
  }

  // 범례: 두 줄 칸
  const cols = 2;
  const rowH = 24;
  const legendTop = faceBottom + 10;
  const legendSvg = legend
    .map((item, i) => {
      const full = item.strong;
      const col = full ? 0 : (i - (legend[0]?.strong ? 1 : 0)) % cols;
      const row = full ? 0 : Math.floor((i - (legend[0]?.strong ? 1 : 0)) / cols) + (legend[0]?.strong ? 1 : 0);
      const x = 24 + col * ((Wv - 48) / cols);
      const y = legendTop + row * rowH;
      return `<text x="${x}" y="${y}" ${SANS} font-size="${full ? 13 : 12}" font-weight="${full ? 800 : 500}" fill="${COLOR.ink}">${item.text}<tspan fill="${COLOR[item.grade]}" font-weight="800"> ${GRADE_TEXT[item.grade]}</tspan></text>`;
    })
    .join('');
  const rows = legend[0]?.strong ? 1 + Math.ceil((legend.length - 1) / cols) : Math.ceil(legend.length / cols);
  const Hv = legendTop + rows * rowH + 34;

  const head = `
    <text x="24" y="40" ${FONT} font-size="22" font-weight="900" fill="${COLOR.ink}">${title}</text>
    <text x="24" y="62" ${SANS} font-size="11" fill="${COLOR.faint}">내 얼굴 비율로 다시 그린 관상도 · 사진 아님</text>
    <g transform="translate(${Wv - 64} 18)"><rect width="42" height="42" rx="4" fill="${COLOR.seal}"/><text x="21" y="22" ${FONT} font-size="15" font-weight="900" fill="${COLOR.paper}" text-anchor="middle" dominant-baseline="central" letter-spacing="-1">觀相</text></g>
    <text x="${g.cx + g.W / 2 + 22}" y="${(g.yHair + g.browY) / 2}" ${SANS} font-size="10" fill="${COLOR.faint}">상정</text>
    <text x="${g.cx + g.W / 2 + 22}" y="${(g.browY + g.noseBaseY) / 2}" ${SANS} font-size="10" fill="${COLOR.faint}">중정</text>
    <text x="${g.cx + g.W / 2 + 22}" y="${(g.noseBaseY + g.chinY) / 2}" ${SANS} font-size="10" fill="${COLOR.faint}">하정</text>`;
  const foot = `<text x="${Wv / 2}" y="${Hv - 14}" ${SANS} font-size="10" fill="${COLOR.faint}" text-anchor="middle">길 <tspan fill="${COLOR.good}">●</tspan>  평 <tspan fill="${COLOR.mid}">●</tspan>  흉 <tspan fill="${COLOR.bad}">●</tspan> · 麻衣相法·相理衡眞</text>`;

  return {
    width: Wv,
    height: Hv,
    svg: `<svg viewBox="0 0 ${Wv} ${Hv}" width="${Wv}" height="${Hv}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}"><rect width="${Wv}" height="${Hv}" rx="16" fill="${COLOR.paper}"/>${head}${parts.join('')}${legendSvg}${foot}</svg>`,
  };
}
