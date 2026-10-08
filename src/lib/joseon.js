// '조선시대였다면 나는' — 사주(십성)와 관상(대표 부위·궁)을 엮어 조선의 삶 한 장면을 고르고,
// 그것을 오늘의 조건으로 옮겨 읽는다.
// 주의: 원전(麻衣·衡眞)에도, 사주 고전에도 '조선 직업 배정'은 없다. 십성→일의 성격은 현대 명리에서
// 흔히 쓰는 대응(재성=재물·사업, 관성=조직·관직, 인성=학문, 식상=표현·기술, 비겁=독립·경쟁)이고,
// 그것을 조선의 직업으로 옮긴 것은 우리가 만든 재미 해석이다. 천민·노비 같은 배정은 하지 않는다.
import { computeSaju, STEM_ELEMENT, BRANCH_ELEMENT, ELEMENTS } from './saju.js';

// 일간 오행 기준 관계 → 십성 무리
const GROUP_OF = (day, el) => {
  if (el === day) return 'bi'; // 비겁: 같은 오행
  if ((day + 1) % 5 === el) return 'sik'; // 식상: 내가 낳음
  if ((day + 2) % 5 === el) return 'jae'; // 재성: 내가 다스림
  if ((el + 2) % 5 === day) return 'gwan'; // 관성: 나를 다스림
  return 'in'; // 인성: 나를 낳음
};
export const GROUP_NAME = { bi: '비겁(比劫)', sik: '식상(食傷)', jae: '재성(財星)', gwan: '관성(官星)', in: '인성(印星)' };

/** 생년월일시 → 사주 + 십성 무리 개수 (일간 자신은 뺀다) */
export function sajuGroups({ date, time }) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time ? time.split(':').map(Number) : [null, 0];
  const s = computeSaju({ year: y, month: m, day: d, hour: hh, minute: mm });
  const day = STEM_ELEMENT[s.pillars.day.stem];
  const chars = [];
  for (const k of ['year', 'month', 'day', 'hour']) {
    const p = s.pillars[k];
    if (!p) continue;
    if (k !== 'day') chars.push(STEM_ELEMENT[p.stem]);
    chars.push(BRANCH_ELEMENT[p.branch]);
  }
  const groups = { bi: 0, sik: 0, jae: 0, gwan: 0, in: 0 };
  for (const el of chars) groups[GROUP_OF(day, el)]++;
  return { saju: s, dayElement: ELEMENTS[day], groups };
}

// 십성 무리 ↔ 관상에서 같은 일을 맡는 자리
const FACE_NAME = { gwanrok: '이마 가운데(관록궁)', namak: '이마(남악)', myung: '미간(명궁)', gamchal: '눈(감찰관)', chulnap: '입(출납관)', injung: '인중', jaebaek: '코(재백궁)', jungak: '코(중악)', simbyeon: '코(심변관)', dongseo: '광대', bukak: '턱(북악)', nobok: '턱 끝(노복궁)' };
const FACE_OF = { gwan: ['gwanrok', 'namak'], in: ['myung', 'gamchal'], sik: ['chulnap', 'injung'], jae: ['jaebaek', 'jungak', 'simbyeon'], bi: ['dongseo', 'bukak', 'nobok'] };

export const ROLES = {
  jae: {
    m: { name: '객주(客主)', title: '개성 송상의 객주', scene: 'market', hat: 'gat', robe: '#f7f3ea' },
    f: { name: '거상(巨商)', title: '제주의 거상', scene: 'market', hat: 'jjok', robe: '#f2e3c8' },
    then: '장터 길목에 객줏집을 차리고, 팔도의 물건과 소문을 모아 값을 매기는 사람',
    now: ['플랫폼·커머스·중개처럼 "사람과 물건이 지나가는 길목"을 잡는 일', '월급보다 지분·매출에 마음이 가는 사람', '조선엔 상인이 낮은 신분이었지만, 오늘은 사업이 가장 넓게 열린 길'],
  },
  gwan: {
    m: { name: '문관(文官)', title: '홍문관 교리', scene: 'office', hat: 'samo', robe: '#2f4a7a' },
    f: { name: '상궁(尙宮)', title: '대전 상궁', scene: 'office', hat: 'jjok', robe: '#5a6e3a' },
    then: '과거에 붙어 관청에서 문서를 다루고 위계 속에서 한 계단씩 오르는 사람',
    now: ['큰 조직·공공기관·전문 자격처럼 "제도 안에서 올라가는" 길', '규칙이 분명할 때 힘을 내는 사람', '조선엔 과거 한 번이 전부였지만, 오늘은 이직·승진·자격으로 여러 번 오를 수 있다'],
  },
  in: {
    m: { name: '선비(士)', title: '서원의 선비', scene: 'study', hat: 'yugeon', robe: '#f7f3ea' },
    f: { name: '여류 문인', title: '규방의 시인', scene: 'study', hat: 'jjok', robe: '#e9dcc0' },
    then: '책을 읽고 글을 쓰며, 사람들이 찾아와 묻는 사람',
    now: ['연구·교육·기획·글쓰기처럼 "아는 것으로 사는" 일', '배움 자체가 힘이 되는 사람', '조선엔 글이 양반의 것이었지만, 오늘은 누구나 지식을 팔고 가르칠 수 있다'],
  },
  sik: {
    m: { name: '화원(畫員)', title: '도화서의 화원', scene: 'studio', hat: 'gat', robe: '#e9dcc0' },
    f: { name: '침선장(針線匠)', title: '상의원 침선장', scene: 'studio', hat: 'jjok', robe: '#f0d9c8' },
    then: '손재주와 감각으로 그림을 그리고 물건을 지어 이름을 얻는 사람',
    now: ['디자인·콘텐츠·영상·요리처럼 "만들어서 보여 주는" 일', '표현해야 숨이 트이는 사람', '조선엔 장인이 이름을 남기기 어려웠지만, 오늘은 만든 것이 곧 이름이 된다'],
  },
  bi: {
    m: { name: '무관(武官)', title: '훈련도감 초관', scene: 'field', hat: 'jeonrip', robe: '#8a3a2e' },
    f: { name: '의녀(醫女)', title: '내의원 의녀', scene: 'clinic', hat: 'jjok', robe: '#3f6e57' },
    then: '몸과 배짱으로 앞에 서서 사람들을 지키고 이끄는 사람',
    now: ['창업·영업·현장 리더·운동처럼 "직접 부딪쳐 이기는" 일', '혼자서도 버티는 사람', '조선엔 무관이 문관보다 낮게 대우받았지만, 오늘은 실행하는 사람이 판을 바꾼다'],
  },
};

/**
 * @param {{date:string|null, time:string|null}} birth
 * @param {object} results readFace().results
 * @param {{organ:string, name:string}|null} lead 대표 부위
 * @param {'m'|'f'|null} gender
 */
export function joseonSelf(birth, results, lead, gender) {
  const sg = sajuGroups(birth ?? {});
  const score = { bi: 0, sik: 0, jae: 0, gwan: 0, in: 0 };
  const why = { bi: [], sik: [], jae: [], gwan: [], in: [] };
  if (sg) for (const [k, n] of Object.entries(sg.groups)) {
    score[k] += n;
    if (n) why[k].push(`사주에 ${GROUP_NAME[k]} ${n}개`);
  }
  for (const [k, keys] of Object.entries(FACE_OF)) {
    for (const key of keys) {
      if (results?.[key]?.grade === 'good') {
        score[k] += 1;
        why[k].push(`관상 ${FACE_NAME[key]}`);
      }
    }
  }
  const LEAD_GROUP = { nose: 'jae', mouth: 'sik', eye: 'in', brow: 'bi' };
  if (lead && LEAD_GROUP[lead.organ]) {
    score[LEAD_GROUP[lead.organ]] += 1.5;
    why[LEAD_GROUP[lead.organ]].push(`대표 부위 ${lead.name}`);
  }
  const key = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
  // 같은 부위 관상 근거는 묶는다: '관상 코(재백궁)·코(중악)' → '관상: 코의 길한 자리 2곳'
  const face = why[key].filter((w) => w.startsWith('관상 '));
  if (face.length > 1) {
    const parts = [...new Set(face.map((w) => w.slice(3).replace(/\(.*\)/, '')))];
    why[key] = [...why[key].filter((w) => !w.startsWith('관상 ')), `관상 ${parts.join('·')}의 길한 자리 ${face.length}곳`];
  }
  const R = ROLES[key];
  const look = R[gender === 'f' ? 'f' : 'm'];
  return { key, ...look, then: R.then, now: R.now, score, why: why[key], saju: sg };
}
