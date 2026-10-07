// 기색(氣色) — 『麻衣相法』 p33~40(십이궁·부모궁), p162~165(氣色).
// 결정(2026-10-07): 밝은 곳에서 찍고, 얼굴 안에서 비교한다.
//   · 절대 빛깔(얼굴 전체가 누렇다 등)은 판정하지 않는다 — 조명 색·카메라 화이트밸런스가 더 크게 바꾼다.
//   · 각 부위의 빛깔을 같은 사진의 두 뺨(기준 피부)과 비교한 차이(밝기 dL, 붉음 da, 누름 db)만 본다.
//   · 원전에 '그 부위 + 그 빛깔'이 함께 나온 구절만 판정한다. 없는 조합은 말하지 않는다.
// 기준서: docs/기색-기준.md

// ── 측정 ──
// 부위: 중심 랜드마크(좌우면 둘) + 반지름(두 눈 안쪽 끝 사이 거리의 배수)
export const CX_REGIONS = {
  ref: { name: '두 뺨(기준)', at: [50, 280], r: 0.45 },
  myung: { name: '인당', at: [9], r: 0.28 },
  gwanrok: { name: '중정(이마 가운데)', at: [151], r: 0.35, forehead: true },
  bumo: { name: '일월각(이마 위 양쪽)', at: [104, 333], r: 0.28, forehead: true },
  jilaek: { name: '산근', at: [168], r: 0.2 },
  yeonsu: { name: '연상·수상(콧대 가운데)', at: [195], r: 0.2 },
  jaebaek: { name: '준두(코끝)', at: [4], r: 0.22 },
  // 눈꼬리(33·263)에서 바깥쪽으로 비켜 잰다 — 흰자가 섞이지 않게
  cheocheop: { name: '어미·간문(눈꼬리 옆)', at: [33, 263], r: 0.13, out: 0.24 },
};

// sRGB(0~255) → CIE Lab (D65)
function lab(r, g, b) {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}

const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** 원 안의 피부 픽셀 Lab 중앙값 (반사광 L>92 는 뺀다) */
function patch({ data, width, height }, cx, cy, rad, skin = null) {
  const L = [], A = [], B = [];
  let glare = 0, n = 0;
  const step = Math.max(1, Math.floor(rad / 8));
  for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(height - 1, cy + rad); y += step) {
    for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(width - 1, cx + rad); x += step) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
      const i = (y * width + x) * 4;
      const [l, a, b] = lab(data[i], data[i + 1], data[i + 2]);
      n++;
      if (l > 92) {
        glare++;
        continue;
      }
      // 기준 피부와 빛깔이 크게 다르면(배경·머리카락·흰자) 뺀다
      if (skin && (Math.abs(a - skin.a) > 14 || Math.abs(b - skin.b) > 14 || Math.abs(l - skin.L) > 35)) continue;
      L.push(l); A.push(a); B.push(b);
    }
  }
  return { L: median(L), a: median(A), b: median(B), n, glare: n ? glare / n : 0 };
}

/**
 * @param {{data:Uint8ClampedArray,width:number,height:number}} img
 * @param {{x:number,y:number}[]} landmarks 정규화 좌표
 * @param {{status:string}|null} forehead 이마가 가려지면 이마 부위는 재지 않는다
 */
export function measureComplexion(img, landmarks, forehead = null) {
  const P = (i) => ({ x: landmarks[i].x * img.width, y: landmarks[i].y * img.height });
  const unit = Math.hypot(P(133).x - P(362).x, P(133).y - P(362).y);
  const regions = {};
  const centers = {};
  const midX = (P(33).x + P(263).x) / 2;
  for (const [k, r] of Object.entries(CX_REGIONS)) {
    if (r.forehead && forehead?.status !== 'visible') continue;
    const cs = r.at.map((i) => {
      const p = P(i);
      const dx = r.out ? Math.sign(p.x - midX) * r.out * unit : 0;
      return { x: p.x + dx, y: p.y, r: r.r * unit };
    });
    centers[k] = cs;
    const skin = regions.ref ? { L: regions.ref.L, a: regions.ref.a, b: regions.ref.b } : null;
    const ps = cs.map((c) => patch(img, c.x, c.y, c.r, skin));
    const avg = (key) => ps.reduce((s, p) => s + p[key], 0) / ps.length;
    regions[k] = { L: avg('L'), a: avg('a'), b: avg('b'), glare: avg('glare'), sides: ps };
  }
  const ref = regions.ref;
  const deltas = {};
  for (const [k, r] of Object.entries(regions)) {
    if (k === 'ref') continue;
    deltas[k] = { dL: r.L - ref.L, da: r.a - ref.a, db: r.b - ref.b, glare: r.glare };
  }
  return { ref: { L: ref.L, a: ref.a, b: ref.b }, deltas, quality: qualityOf(regions), centers };
}

/** 촬영 검사: 어두움, 한쪽만 빛 받음(그림자를 기색으로 오인), 과노출 */
export function qualityOf(regions) {
  const [r, l] = regions.ref.sides;
  const issues = [];
  if (regions.ref.L < 35) issues.push('얼굴이 어두워요. 더 밝은 곳에서 찍어 주세요.');
  if (Math.abs(r.L - l.L) > 8) issues.push('빛이 한쪽에서만 와요. 창문이나 조명을 정면에 두고 찍어 주세요.');
  if (regions.ref.glare > 0.2) issues.push('빛이 너무 강해 얼굴이 하얗게 날아갔어요.');
  return { ok: issues.length === 0, issues, sideDiff: r.L - l.L };
}

// ── 판정 ──
// 임계값(Lab 단위): 보정 데이터가 쌓이면 부위별로 '보통 사람의 차이'를 빼고 다시 정한다.
// 이마·코끝은 원래 빛을 더 받아 밝게 찍히므로 그 몫(offset)을 먼저 빼 둔다(추정치).
export const CX_T = { L: 7, a: 5, b: 5 };
const OFFSET = { gwanrok: { dL: 3 }, jaebaek: { dL: 6 }, yeonsu: { dL: 3 }, bumo: { dL: 2 } };

/** 빛깔 이름: 밝음(明)·어두움(暗/黑)·붉음(赤/紅)·누름(黃)·푸름(青)·흼(白) */
export function hues(d, key) {
  const o = OFFSET[key] ?? {};
  const dL = d.dL - (o.dL ?? 0);
  const out = [];
  if (dL > CX_T.L) out.push('明');
  if (dL < -CX_T.L) out.push('暗');
  if (dL < -CX_T.L * 1.6) out.push('黑');
  if (d.da > CX_T.a) out.push('赤');
  if (d.db > CX_T.b && d.da <= CX_T.a) out.push('黃');
  if (d.da < -CX_T.a / 2 && d.db < -CX_T.b / 2) out.push('青');
  if (dL > CX_T.L && Math.abs(d.da) < 2 && d.db < 0) out.push('白');
  return out;
}

const R = (q, s, t) => ({ q, s, t });
// 원전에 부위와 빛깔이 함께 나온 구절만
const RULES = [
  { key: 'myung', when: ['明'], grade: 'good', ref: R('光明如鏡 學問皆通', '麻衣 p33', '(인당이) 거울처럼 밝으면 학문에 두루 통한다.') },
  { key: 'gwanrok', when: ['明'], grade: 'good', ref: R('光明瑩淨 顯達超群', '麻衣 p36', '(중정이) 밝고 맑으면 무리를 넘어 높이 드러난다.') },
  { key: 'cheocheop', when: ['明'], grade: 'good', ref: R('光潤', '麻衣 p35', '(어미·간문이) 밝고 윤택하면 아내를 온전히 지킨다.') },
  { key: 'jaebaek', when: ['明'], grade: 'good', ref: R('豐滿明潤 財帛有餘', '麻衣 p33', '(코가) 밝고 윤택하면 재물이 넉넉하다.') },
  { key: 'bumo', when: ['赤', '黃'], any: true, grade: 'good', ref: R('紅黃 主雙親喜慶', '麻衣 p39', '(부모궁이) 붉고 누르면 부모에게 기쁜 일이 있다.') },
  { key: 'bumo', when: ['青'], grade: 'bad', ref: R('青 主父母憂疑', '麻衣 p39', '(부모궁이) 푸르면 부모에게 근심이 있다.') },
  { key: 'bumo', when: ['黑'], grade: 'bad', ref: R('黑白 主父母喪亡', '麻衣 p39', '(부모궁이) 검거나 희면 부모의 상을 당한다.') },
  { key: 'yeonsu', when: ['黃'], grade: 'good', season: true, ref: R('四季月年壽宜黃', '麻衣 p165', '사계월(3·6·9·12월)에는 연상·수상이 누른 것이 마땅하다.') },
  { key: 'yeonsu', when: ['白'], grade: 'bad', ref: R('白主服', '麻衣 p165', '(연상·수상이) 희면 상복을 입는다.') },
  { key: 'yeonsu', when: ['赤'], grade: 'bad', ref: R('紅主訟及瘡疾破財', '麻衣 p165', '붉으면 송사와 종기, 재물을 잃음이 있다.') },
  { key: 'yeonsu', when: ['青'], grade: 'bad', ref: R('青主驚恐疾病', '麻衣 p165', '푸르면 놀라고 두려운 일과 병이 있다.') },
  { key: 'yeonsu', when: ['黑'], grade: 'bad', ref: R('黑主大病死亡', '麻衣 p165', '검으면 큰 병과 죽음이 있다.') },
  { key: 'jilaek', when: ['赤', '暗'], grade: 'bad', ref: R('紅色 … 黑氣者 主大禍 居疾厄主死', '麻衣 p164', '붉은빛에 검은 기운이 섞이면 큰 화가 있고, 질액궁(산근)에 있으면 죽음을 뜻한다.') },
  { key: 'gwanrok', when: ['赤', '暗'], grade: 'bad', ref: R('紅色 … 黑氣者 主大禍 居官祿主降官失職', '麻衣 p164', '붉은빛에 검은 기운이 섞이면 큰 화가 있고, 관록궁에 있으면 벼슬이 깎이고 자리를 잃는다.') },
];

// 원전: 기색이 나타나도 신(神)이 바르고 왕성하면 끝내 큰 화가 되지 못한다 — 신은 재지 않으므로 늘 함께 싣는다.
export const SPIRIT_NOTE = R('以上氣色雖現 尤要看神色 正而神旺 色終莫能爲大禍', '麻衣 p165', '위의 기색이 나타나도 신(神)을 더 보아야 한다. 빛깔이 바르고 신이 왕성하면 그 빛깔은 끝내 큰 화가 되지 못한다.');

const SEASON_MONTHS = [3, 6, 9, 12];

/**
 * @param {ReturnType<typeof measureComplexion>} cx
 * @param {{month?:number}} opts 사계월 판단용(양력 근사 — 원전은 음력)
 */
export function readComplexion(cx, { month = new Date().getMonth() + 1 } = {}) {
  if (!cx?.quality?.ok) return { ok: false, issues: cx?.quality?.issues ?? ['기색을 재지 못했어요.'], items: [] };
  const items = [];
  for (const rule of RULES) {
    const d = cx.deltas[rule.key];
    if (!d) continue;
    if (d.glare > 0.35) continue; // 반사광이 덮은 부위는 보지 않는다
    const h = hues(d, rule.key);
    const hit = rule.any ? rule.when.some((c) => h.includes(c)) : rule.when.every((c) => h.includes(c));
    if (!hit) continue;
    if (rule.season && !SEASON_MONTHS.includes(month)) continue;
    items.push({ key: rule.key, region: CX_REGIONS[rule.key].name, hues: h, grade: rule.grade, ref: rule.ref });
  }
  return { ok: true, items, note: SPIRIT_NOTE };
}
