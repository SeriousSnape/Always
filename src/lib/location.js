// 위치 기반 풀이: 기준점(출생지 또는 집) → 현재 위치의 방위를 후천팔괘 오행으로 보고
// 사주의 부족/과다 오행, 얼굴 오행형, 오늘 일진과 비교한다.
import { ELEMENTS, BRANCH_ELEMENT, STEM_ELEMENT, elementRelation, dayPillarOf } from './saju.js';

export const CITIES = [
  ['서울', 37.5665, 126.978], ['부산', 35.1796, 129.0756], ['대구', 35.8714, 128.6014],
  ['인천', 37.4563, 126.7052], ['광주', 35.1595, 126.8526], ['대전', 36.3504, 127.3845],
  ['울산', 35.5384, 129.3114], ['세종', 36.48, 127.289], ['수원', 37.2636, 127.0286],
  ['춘천', 37.8813, 127.7298], ['원주', 37.3422, 127.9202], ['강릉', 37.7519, 128.8761],
  ['청주', 36.6424, 127.489], ['천안', 36.8151, 127.1139], ['전주', 35.8242, 127.148],
  ['목포', 34.8118, 126.3922], ['여수', 34.7604, 127.6622], ['안동', 36.5684, 128.7294],
  ['포항', 36.019, 129.3435], ['창원', 35.2281, 128.6811], ['진주', 35.18, 128.1076],
  ['제주', 33.4996, 126.5312],
].map(([name, lat, lon]) => ({ name, lat, lon }));

// 8방위 → 후천팔괘 오행
export const DIRECTIONS = [
  { name: '북', gua: '감(坎)', el: 4 },
  { name: '북동', gua: '간(艮)', el: 2 },
  { name: '동', gua: '진(震)', el: 0 },
  { name: '남동', gua: '손(巽)', el: 0 },
  { name: '남', gua: '리(離)', el: 1 },
  { name: '남서', gua: '곤(坤)', el: 2 },
  { name: '서', gua: '태(兌)', el: 3 },
  { name: '북서', gua: '건(乾)', el: 3 },
];
export const ELEMENT_DIRECTION = ['동', '남', '중앙', '서', '북'];

const rad = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** 진북 기준 방위각(도) */
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function directionOf(deg) {
  return DIRECTIONS[Math.round(deg / 45) % 8];
}

const VERDICTS = [
  { min: 3, label: '대길', emoji: '🌟', text: '지금 이 자리는 당신의 기운을 크게 살려 주는 명당입니다.' },
  { min: 1, label: '길', emoji: '😊', text: '기운이 잘 맞는 자리입니다. 중요한 약속이나 결정에 좋아요.' },
  { min: -1, label: '평', emoji: '🙂', text: '무난한 자리입니다. 특별히 득도 실도 없어요.' },
  { min: -99, label: '주의', emoji: '⚠️', text: '기운이 엇갈리는 자리입니다. 큰 결정은 다른 곳에서 하는 게 좋겠어요.' },
];

/**
 * @param {object} p
 * @param {{lat:number,lon:number,name?:string}} p.origin 기준점
 * @param {{lat:number,lon:number}} p.here 현재 위치
 * @param {ReturnType<import('./saju.js').computeSaju>} p.saju
 * @param {number|null} p.faceEl
 * @param {Date} [p.today]
 */
export function evaluateLocation({ origin, here, saju, faceEl, today = new Date() }) {
  const km = distanceKm(origin, here);
  const near = km < 2;
  const dir = near ? { name: '중앙', gua: '중궁', el: 2 } : directionOf(bearing(origin, here));
  const el = dir.el;
  const reasons = [];
  let score = 0;

  if (el === saju.lacking) {
    score += 2;
    reasons.push(['+', `사주에 부족한 ${ELEMENTS[el]} 기운을 채워 주는 방위입니다.`]);
  } else if ((el + 1) % 5 === saju.lacking) {
    score += 1;
    reasons.push(['+', `부족한 ${ELEMENTS[saju.lacking]} 기운을 낳아 주는 ${ELEMENTS[el]} 방위입니다.`]);
  }
  if (saju.excess !== null && el === saju.excess) {
    score -= 2;
    reasons.push(['-', `이미 넘치는 ${ELEMENTS[el]} 기운이 더해지는 방위입니다.`]);
  }
  const dayRel = elementRelation(el, saju.dayElement);
  if (dayRel === 'gen') {
    score += 1;
    reasons.push(['+', `방위의 ${ELEMENTS[el]} 기운이 본성(일간 ${ELEMENTS[saju.dayElement]})을 돕습니다.`]);
  } else if (dayRel === 'ctrl') {
    score -= 1;
    reasons.push(['-', `방위의 ${ELEMENTS[el]} 기운이 본성(일간 ${ELEMENTS[saju.dayElement]})을 누릅니다.`]);
  }
  if (faceEl !== null && faceEl !== undefined) {
    const faceRel = elementRelation(el, faceEl);
    if (faceRel === 'gen' || faceRel === 'same') {
      score += 1;
      reasons.push(['+', `관상으로 봐도 ${ELEMENTS[faceEl]}형 얼굴이 기를 펴는 자리입니다.`]);
    } else if (faceRel === 'ctrl') {
      score -= 1;
      reasons.push(['-', `관상으로 보면 ${ELEMENTS[faceEl]}형 얼굴의 기세가 꺾이는 자리입니다.`]);
    }
  }
  const todayPillar = dayPillarOf(today);
  const todayEl = BRANCH_ELEMENT[todayPillar.branch];
  const todayRel = elementRelation(todayEl, el);
  if (todayRel === 'gen' || todayRel === 'same') {
    score += 1;
    reasons.push(['+', `오늘 일진(${todayPillar.name}일)의 ${ELEMENTS[todayEl]} 기운이 이 방위를 밀어 줍니다.`]);
  } else if (todayRel === 'ctrl') {
    score -= 1;
    reasons.push(['-', `오늘 일진(${todayPillar.name}일)의 ${ELEMENTS[todayEl]} 기운이 이 방위와 부딪힙니다.`]);
  }

  const verdict = VERDICTS.find((v) => score >= v.min);
  const best = saju.lacking;
  return {
    km,
    direction: dir,
    element: el,
    score,
    verdict,
    reasons,
    today: todayPillar,
    todayStemEl: STEM_ELEMENT[todayPillar.stem],
    tip:
      el === best
        ? '지금 방향이 바로 당신의 길방(吉方)입니다.'
        : `당신의 길방은 ${origin.name ?? '기준점'}에서 ${ELEMENT_DIRECTION[best]}쪽(${ELEMENTS[best]})입니다.`,
  };
}

/** JPEG EXIF에서 GPS 좌표 추출. 없으면 null */
export function readExifGps(buffer) {
  const v = new DataView(buffer);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    if (v.getUint8(off) !== 0xff) return null;
    const marker = v.getUint8(off + 1);
    const size = v.getUint16(off + 2);
    if (marker === 0xe1 && v.getUint32(off + 4) === 0x45786966) return parseTiffGps(v, off + 10);
    if (marker === 0xda) return null; // 이미지 데이터 시작 — EXIF 없음
    off += 2 + size;
  }
  return null;
}

function parseTiffGps(v, tiff) {
  const le = v.getUint16(tiff) === 0x4949;
  const u16 = (o) => v.getUint16(o, le);
  const u32 = (o) => v.getUint32(o, le);
  const ifd0 = tiff + u32(tiff + 4);
  let gpsIfd = null;
  for (let i = 0, n = u16(ifd0); i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (u16(e) === 0x8825) gpsIfd = tiff + u32(e + 8);
  }
  if (gpsIfd === null) return null;
  const tags = {};
  for (let i = 0, n = u16(gpsIfd); i < n; i++) {
    const e = gpsIfd + 2 + i * 12;
    const tag = u16(e);
    if (tag === 1 || tag === 3) tags[tag] = String.fromCharCode(v.getUint8(e + 8));
    if (tag === 2 || tag === 4) {
      const p = tiff + u32(e + 8);
      const r = (k) => u32(p + k * 8) / u32(p + k * 8 + 4);
      tags[tag] = r(0) + r(1) / 60 + r(2) / 3600;
    }
  }
  if (tags[2] === undefined || tags[4] === undefined) return null;
  return {
    lat: tags[1] === 'S' ? -tags[2] : tags[2],
    lon: tags[3] === 'W' ? -tags[4] : tags[4],
  };
}
