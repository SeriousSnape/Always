// 사주(四柱) 계산 — 절기는 태양 황경을 직접 계산해서 판정한다 (Meeus 저정밀 식, 오차 수 분 수준).
// 한계: 균시차 미반영, 1954~1961 표준시(UTC+8:30)와 1987~1988 서머타임만 반영.

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 오행: 0 목, 1 화, 2 토, 3 금, 4 수
export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const ELEMENTS_HANJA = ['木', '火', '土', '金', '水'];
export const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
export const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

export const generates = (a, b) => (a + 1) % 5 === b; // a가 b를 생함
export const controls = (a, b) => (a + 2) % 5 === b; // a가 b를 극함

/** 두 오행의 관계: same | gen(a→b) | genBy(b→a) | ctrl(a→b) | ctrlBy(b→a) */
export function elementRelation(a, b) {
  if (a === b) return 'same';
  if (generates(a, b)) return 'gen';
  if (generates(b, a)) return 'genBy';
  if (controls(a, b)) return 'ctrl';
  return 'ctrlBy';
}

const mod = (n, m) => ((n % m) + m) % m;
const rad = (d) => (d * Math.PI) / 180;

/** 그레고리력 날짜 → 율리우스 일수(정오 기준 정수) */
export function julianDayNumber(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** 시각(ms, UTC) → 태양 시황경(도) */
export function solarLongitude(utcMs) {
  const jd = utcMs / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = rad(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const omega = rad(125.04 - 1934.136 * t);
  return mod(l0 + c - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

/** 한국 표준시 오프셋(분). 법정 시간대 변경과 1987·88 서머타임만 반영 */
export function koreaUtcOffsetMinutes(y, m, d, h) {
  const key = y * 1e6 + m * 1e4 + d * 100 + h;
  if (key >= 1954032100 && key < 1961081000) return 510; // UTC+8:30
  if (key >= 1987051002 && key < 1987101103) return 600;
  if (key >= 1988050802 && key < 1988100903) return 600;
  return 540;
}

const pillar = (stem, branch) => ({
  stem,
  branch,
  name: STEMS[stem] + BRANCHES[branch],
  hanja: STEMS_HANJA[stem] + BRANCHES_HANJA[branch],
});

/**
 * @param {object} input
 * @param {number} input.year
 * @param {number} input.month 1-12
 * @param {number} input.day
 * @param {number|null} input.hour 0-23, 모르면 null
 * @param {number} [input.minute]
 * @param {number} [input.longitude] 출생지 경도 — 진태양시 보정에 사용 (기본 서울)
 * @param {boolean} [input.lateZiNextDay] 23시 이후를 다음 날 일진으로 볼지 (기본 true)
 */
export function computeSaju({ year, month, day, hour = null, minute = 0, longitude = 126.978, lateZiNextDay = true }) {
  const hasTime = hour !== null && hour !== undefined;
  const h = hasTime ? hour : 12;
  const offset = koreaUtcOffsetMinutes(year, month, day, h);
  const utcMs = Date.UTC(year, month - 1, day, h, minute) - offset * 60000;

  // 절기 판정은 실제 순간(UTC)의 태양 황경으로
  const lambda = solarLongitude(utcMs);
  const monthIdx = Math.floor(mod(lambda - 315, 360) / 30); // 0 = 인월(입춘~경칩)

  let sajuYear = year;
  if (month <= 2 && monthIdx >= 10) sajuYear -= 1; // 입춘 전
  const yearStem = mod(sajuYear - 4, 10);
  const yearBranch = mod(sajuYear - 4, 12);

  const monthBranch = (monthIdx + 2) % 12;
  const monthStem = mod((yearStem % 5) * 2 + 2 + monthIdx, 10);

  // 일·시는 출생지 진태양시(경도 보정)로
  const solarMs = utcMs + longitude * 4 * 60000;
  const solar = new Date(solarMs);
  let jdn = julianDayNumber(solar.getUTCFullYear(), solar.getUTCMonth() + 1, solar.getUTCDate());
  const solarMinutes = solar.getUTCHours() * 60 + solar.getUTCMinutes();
  if (hasTime && lateZiNextDay && solarMinutes >= 23 * 60) jdn += 1;
  const dayIdx = mod(jdn + 49, 60);
  const dayStem = dayIdx % 10;
  const dayBranch = dayIdx % 12;

  let hourPillar = null;
  if (hasTime) {
    const hourBranch = Math.floor((solarMinutes + 60) / 120) % 12;
    const hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);
    hourPillar = pillar(hourStem, hourBranch);
  }

  const pillars = {
    year: pillar(yearStem, yearBranch),
    month: pillar(monthStem, monthBranch),
    day: pillar(dayStem, dayBranch),
    hour: hourPillar,
  };

  const counts = [0, 0, 0, 0, 0];
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    counts[STEM_ELEMENT[p.stem]] += 1;
    counts[BRANCH_ELEMENT[p.branch]] += 1;
  }

  const dayElement = STEM_ELEMENT[dayStem];
  // 단순화한 신강/신약: 일간과 같은 오행 + 일간을 생하는 오행의 비중
  const supportEl = mod(dayElement - 1, 5);
  const support = counts[dayElement] + counts[supportEl];
  const total = counts.reduce((a, b) => a + b, 0);
  const strength = support / total >= 0.5 ? '신강' : '신약';

  return {
    pillars,
    hasTime,
    counts,
    dayElement,
    strength,
    lacking: lackingElement(counts),
    excess: excessElement(counts),
    animal: ANIMALS[yearBranch],
    solarLongitude: lambda,
  };
}

/** 가장 부족한 오행(동률이면 낮은 인덱스) */
export function lackingElement(counts) {
  let idx = 0;
  for (let i = 1; i < 5; i++) if (counts[i] < counts[idx]) idx = i;
  return idx;
}

/** 3개 이상 몰린 오행, 없으면 null */
export function excessElement(counts) {
  let idx = 0;
  for (let i = 1; i < 5; i++) if (counts[i] > counts[idx]) idx = i;
  return counts[idx] >= 3 ? idx : null;
}

/** 특정 날짜의 일진 */
export function dayPillarOf(date) {
  const idx = mod(julianDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 49, 60);
  return pillar(idx % 10, idx % 12);
}

export const STEM_COMBINE = [5, 6, 7, 8, 9, 0, 1, 2, 3, 4]; // 갑기·을경·병신·정임·무계 합
export const BRANCH_SIX_COMBINE = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]; // 자축·인해·묘술·진유·사신·오미
export const branchClash = (a, b) => mod(a - b, 12) === 6;

export const DAY_STEM_TEXT = [
  { title: '큰 나무', text: '곧게 위로 뻗으려는 사람. 원칙과 자존심이 있고, 한번 정한 방향은 잘 바꾸지 않습니다.' },
  { title: '덩굴과 화초', text: '부드럽게 휘어 결국 원하는 곳에 닿는 사람. 적응력과 사교성이 뛰어납니다.' },
  { title: '태양', text: '숨기는 게 없고 주변을 밝히는 사람. 열정이 크지만 쉽게 뜨거워지고 식기도 합니다.' },
  { title: '촛불', text: '가까운 사람을 따뜻하게 비추는 사람. 섬세하고 집중력이 깊습니다.' },
  { title: '큰 산', text: '묵직하게 버티는 사람. 믿음직하지만 변화엔 시간이 걸립니다.' },
  { title: '논밭의 흙', text: '무엇이든 품고 길러내는 사람. 실속을 챙기고 사람을 잘 키웁니다.' },
  { title: '바위와 무쇠', text: '결단이 빠르고 의리가 강한 사람. 맺고 끊음이 분명합니다.' },
  { title: '보석', text: '다듬어질수록 빛나는 사람. 감각이 예민하고 자기 기준이 높습니다.' },
  { title: '큰 강과 바다', text: '스케일이 크고 자유로운 사람. 생각이 넓고 흐름을 읽습니다.' },
  { title: '이슬과 빗물', text: '조용히 스며드는 사람. 직관과 공감 능력이 뛰어납니다.' },
];

export const ELEMENT_TRAIT = [
  '성장·기획·인자함',
  '표현·열정·예의',
  '신뢰·중재·포용',
  '결단·원칙·의리',
  '지혜·유연·통찰',
];
