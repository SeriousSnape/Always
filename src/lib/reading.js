// 전통 관상 풀이: 십이궁(十二宮), 유년운기(流年運氣, 나이별로 얼굴의 어느 자리가 운을 맡는지), 삼정, 총평.
// 측정할 수 없는 자리(귀, 와잠, 일각·월각 등)는 풀이에서 빼고 그 사실을 밝힌다.
import { z } from './physiognomy.js';
import { josa } from './josa.js';

const zz = (m, k) => (m[k] === undefined ? 0 : z(m, k));
const mix = (...v) => v.reduce((a, b) => a + b, 0) / Math.sqrt(v.length);

export const GRADE = {
  good: { label: '길(吉)', short: '길', tone: 'good' },
  mid: { label: '평(平)', short: '평', tone: 'mid' },
  bad: { label: '주의', short: '주의', tone: 'bad' },
};
const gradeOf = (s) => (s > 0.6 ? 'good' : s < -0.6 ? 'bad' : 'mid');

const PALACES = [
  {
    key: 'myung', name: '명궁', hanja: '命宮', area: '인당(미간)', domain: '운의 흐름', tag: '#운이_트이는_상',
    score: (m) => zz(m, 'browGap'),
    good: '인당이 시원하게 열려 있습니다. 마음이 넓고 막힌 일이 잘 풀리는 상으로, 스스로 길을 열어 가는 힘이 큽니다.',
    mid: '인당 너비가 알맞아 판단이 균형 잡혀 있습니다. 감정에 휩쓸리지 않고 꾸준히 운을 쌓는 타입입니다.',
    bad: '인당이 좁은 편이라 생각이 깊고 예민합니다. 걱정을 오래 품으면 운이 막히기 쉬우니, 결정은 빠르게 내리고 털어내는 연습이 필요합니다.',
    tip: '미간을 찌푸리는 습관을 줄이고 눈썹 사이를 깔끔하게 정리하면 인당이 밝아집니다.',
  },
  {
    key: 'gwanrok', name: '관록궁', hanja: '官祿宮', area: '이마 가운데', domain: '직업과 명예', tag: '#명예운',
    score: (m) => zz(m, 'upper'),
    good: '이마가 높고 넓어 관록궁이 좋습니다. 조직에서 인정받고 이름을 얻는 운이 있으며, 윗사람의 도움을 받습니다.',
    mid: '이마가 고른 편이라 직업운이 안정적입니다. 실력을 차곡차곡 쌓아 자리를 만드는 타입입니다.',
    bad: '이마가 낮은 편이라 젊을 때는 윗사람 덕보다 자기 힘으로 일어섭니다. 대신 30대 이후 실력으로 자리를 굳힙니다.',
    tip: '이마를 가리지 않는 머리 모양이 관록궁을 살립니다.',
  },
  {
    key: 'cheoni', name: '천이궁', hanja: '遷移宮', area: '이마 양옆', domain: '이동과 변화', tag: '#해외·이동운',
    score: (m) => zz(m, 'foreheadW'),
    good: '이마 양옆이 넓게 트여 이동과 변화에서 운이 열립니다. 이직, 이사, 해외에서 기회를 잡는 상입니다.',
    mid: '천이궁이 평탄해 변화가 와도 크게 흔들리지 않습니다. 움직일 때와 머물 때를 잘 가립니다.',
    bad: '이마 양옆이 좁은 편이라 익숙한 곳에서 힘을 발휘합니다. 큰 이동은 충분히 준비한 뒤에 하는 것이 좋습니다.',
    tip: '먼 길을 떠나기 전엔 일정을 한 번 더 점검하세요. 천이궁이 약하면 준비가 곧 운입니다.',
  },
  {
    key: 'hyungje', name: '형제궁', hanja: '兄弟宮', area: '눈썹', domain: '친구와 동료', tag: '#인복',
    score: (m) => zz(m, 'browLen'),
    good: '눈썹이 눈보다 길게 뻗어 형제궁이 좋습니다. 친구와 동료의 도움이 많고, 사람을 통해 기회를 얻습니다.',
    mid: '눈썹 길이가 알맞아 인간관계가 고르게 이어집니다. 주고받는 균형이 좋은 사람입니다.',
    bad: '눈썹이 짧은 편이라 넓은 인맥보다 소수의 깊은 관계에 강합니다. 혼자 해내는 힘이 있지만, 도움을 청하는 것도 운입니다.',
    tip: '눈썹 꼬리를 자연스럽게 길게 정리하면 형제궁이 보완됩니다.',
  },
  {
    key: 'jeontaek', name: '전택궁', hanja: '田宅宮', area: '눈썹과 눈 사이', domain: '집과 재산', tag: '#부동산운',
    score: (m) => zz(m, 'browEye'),
    good: '눈썹과 눈 사이가 넉넉해 전택궁이 넓습니다. 집과 땅의 복이 있고 가정이 안정됩니다.',
    mid: '전택궁이 고른 편이라 주거와 재산이 차근차근 쌓입니다.',
    bad: '눈썹과 눈 사이가 가까운 편이라 성격이 급하고 추진력이 강합니다. 집과 재산 문제는 서두르지 말고 오래 지켜볼수록 좋습니다.',
    tip: '큰 계약은 한 박자 늦게 하세요. 전택궁이 좁은 사람에게는 기다림이 이익입니다.',
  },
  {
    key: 'cheocheop', name: '처첩궁', hanja: '妻妾宮', area: '눈꼬리', domain: '연애와 결혼', tag: '#연애운',
    score: (m) => zz(m, 'eyeTilt'),
    good: '눈꼬리가 살짝 올라가 처첩궁에 생기가 있습니다. 매력이 분명하고 연애에서 주도권을 잡는 상입니다.',
    mid: '눈꼬리가 수평에 가까워 연애와 결혼에서 균형 잡힌 관계를 만듭니다.',
    bad: '눈꼬리가 내려간 편이라 다정하고 헌신적입니다. 상대에게 맞추다 지치지 않도록 내 마음도 챙겨야 합니다.',
    tip: '관계에서 원하는 것을 먼저 말로 꺼내 보세요. 처첩궁이 순한 사람은 표현이 곧 개운입니다.',
  },
  {
    key: 'jilaek', name: '질액궁', hanja: '疾厄宮', area: '산근(콧대 뿌리)', domain: '건강', tag: '#건강운',
    score: (m) => zz(m, 'bridgeDepth'),
    good: '콧대 뿌리(산근)가 높고 반듯해 질액궁이 튼튼합니다. 체력과 회복력이 좋고 고비를 잘 넘깁니다.',
    mid: '산근이 고른 편이라 건강운이 무난합니다. 생활 리듬만 지키면 큰 탈이 없습니다.',
    bad: '산근이 낮은 편이라 무리하면 쉽게 지칩니다. 특히 41~43세 무렵은 건강과 일의 고비를 미리 대비하는 것이 좋습니다.',
    tip: '수면과 소화를 먼저 챙기세요. 질액궁은 생활 습관으로 가장 많이 바뀌는 자리입니다.',
  },
  {
    key: 'jaebaek', name: '재백궁', hanja: '財帛宮', area: '코', domain: '재물', tag: '#재물운',
    score: (m) => mix(zz(m, 'noseLength'), zz(m, 'noseWidth')),
    good: '콧대가 곧고 콧방울이 두툼해 재백궁이 좋습니다. 돈을 버는 힘과 모으는 힘을 함께 갖춘 상입니다.',
    mid: '코가 균형 잡혀 버는 만큼 모이는 재물운입니다. 꾸준한 저축이 큰 재산이 됩니다.',
    bad: '코가 작고 단정한 편이라 큰돈보다 알뜰한 관리에 강합니다. 충동 지출만 막으면 재물이 새지 않습니다.',
    tip: '쓰는 통장과 모으는 통장을 나누세요. 재백궁이 약한 사람은 구조가 재물을 지킵니다.',
  },
  {
    key: 'nobok', name: '노복궁', hanja: '奴僕宮', area: '턱 양옆', domain: '후배와 말년 인덕', tag: '#리더십',
    score: (m) => zz(m, 'jaw'),
    good: '턱 양옆이 넉넉해 노복궁이 좋습니다. 따르는 사람이 많고 나이 들수록 인덕이 쌓입니다.',
    mid: '턱선이 고른 편이라 아랫사람과의 관계가 원만합니다.',
    bad: '턱이 갸름한 편이라 사람을 이끌기보다 함께 일하는 데 강합니다. 믿을 만한 한두 사람을 오래 곁에 두세요.',
    tip: '후배에게 먼저 밥을 사세요. 노복궁은 베푼 만큼 돌아오는 자리입니다.',
  },
  {
    key: 'bokdeok', name: '복덕궁', hanja: '福德宮', area: '이마 양옆과 턱', domain: '타고난 복', tag: '#복이_많은_상',
    score: (m) => mix(zz(m, 'foreheadW'), zz(m, 'jaw'), -zz(m, 'asym')),
    good: '이마와 턱이 서로 받쳐 주고 얼굴이 고르게 균형 잡혀 복덕궁이 좋습니다. 큰 걱정 없이 복을 누리는 상입니다.',
    mid: '복덕궁이 고른 편이라 노력한 만큼 복이 따라옵니다.',
    bad: '복덕궁이 약한 편이라 스스로 복을 만들어 가는 사람입니다. 베풀수록 돌아오는 상이니 작은 선행이 개운이 됩니다.',
    tip: '감사한 일을 하루 하나씩 적어 보세요. 복덕궁은 마음의 여유가 얼굴로 드러나는 자리입니다.',
  },
];

export const UNREADABLE_PALACES = '남녀궁(자녀·눈 밑 와잠)과 부모궁(이마 위 일각·월각)은 사진으로 판별하기 어려워 풀이에서 뺐습니다.';

export function readPalaces(m) {
  return PALACES.map((p) => {
    const score = p.score(m);
    const grade = gradeOf(score);
    return { key: p.key, name: p.name, hanja: p.hanja, area: p.area, domain: p.domain, tag: p.tag, score, grade, text: p[grade], tip: grade === 'bad' ? p.tip : null };
  });
}

// 유년운기: 세는 나이 → 얼굴 자리. 귀가 맡는 1~14세는 사진으로 볼 수 없어 제외.
const ZONES = [
  { from: 15, to: 24, area: '이마 윗부분(천중·천정)', theme: '공부와 시험, 윗사람의 도움', score: (m) => zz(m, 'upper'),
    good: '배운 것이 그대로 성과가 되는 시기입니다. 시험, 자격, 첫 직장에서 기회를 잡으세요.', bad: '노력에 비해 인정이 늦게 오는 시기입니다. 조급해하지 말고 기초를 다지면 다음 운에서 크게 받습니다.' },
  { from: 25, to: 27, area: '이마 가운데(중정)', theme: '사회 진출과 자리 잡기', score: (m) => zz(m, 'upper'),
    good: '하는 일이 눈에 띄고 자리가 잡히는 시기입니다. 큰 조직이나 큰 무대에 도전해 보세요.', bad: '방향을 정하는 데 시간이 걸리는 시기입니다. 여러 길을 짧게 시험해 보는 것이 오히려 이롭습니다.' },
  { from: 28, to: 28, area: '인당', theme: '인생의 방향 전환', score: (m) => zz(m, 'browGap'),
    good: '막혀 있던 일이 풀리고 인생의 방향이 선명해지는 해입니다. 새 출발에 좋은 때입니다.', bad: '마음이 복잡해지기 쉬운 해입니다. 큰 결정은 혼자 하지 말고 믿는 사람과 상의하세요.' },
  { from: 29, to: 30, area: '이마 양옆(산림)', theme: '이동과 기반 다지기', score: (m) => zz(m, 'foreheadW'),
    good: '이사, 이직, 유학처럼 자리를 옮기는 일에 운이 따릅니다.', bad: '자리를 옮기기보다 지금 자리에서 기반을 다지는 것이 좋은 시기입니다.' },
  { from: 31, to: 34, area: '눈썹(능운·자기·번하·채하)', theme: '인맥과 동료', score: (m) => zz(m, 'browLen'),
    good: '사람이 운을 데려오는 시기입니다. 모임과 협업에서 기회가 생깁니다.', bad: '사람 문제로 힘이 빠질 수 있는 시기입니다. 동업과 보증은 피하세요.' },
  { from: 35, to: 40, area: '눈(태양·태음·중양·중음·소양·소음)', theme: '능력 발휘, 연애와 결혼', score: (m) => mix(zz(m, 'eyeSize'), zz(m, 'eyeTilt')),
    good: '눈빛에 힘이 실리는 시기입니다. 능력을 인정받고, 연애·결혼에서도 좋은 인연이 닿습니다.', bad: '판단이 흐려지기 쉬운 시기입니다. 계약서와 사람을 한 번 더 확인하세요.' },
  { from: 41, to: 43, area: '산근(콧대 뿌리)', theme: '건강과 일의 고비', score: (m) => zz(m, 'bridgeDepth'),
    good: '고비가 와도 가볍게 넘기는 시기입니다. 체력이 받쳐 주니 승부를 걸어도 좋습니다.', bad: '관상에서 대표적인 고비로 보는 나이입니다. 건강검진과 휴식을 먼저 챙기고, 무리한 확장은 미루세요.' },
  { from: 44, to: 45, area: '콧대(연상·수상)', theme: '지위와 권한', score: (m) => zz(m, 'noseLength'),
    good: '권한과 책임이 커지는 시기입니다. 승진이나 독립에 좋은 때입니다.', bad: '책임은 늘고 보상은 늦는 시기입니다. 맡을 일을 골라 받으세요.' },
  { from: 46, to: 47, area: '관골(광대뼈)', theme: '권세와 대외 활동', score: (m) => -zz(m, 'asym'),
    good: '얼굴의 균형이 좋아 대외 활동에서 힘을 얻는 시기입니다. 이름을 알릴 기회가 옵니다.', bad: '경쟁이 치열해지는 시기입니다. 앞에 나서기보다 실속을 챙기세요.' },
  { from: 48, to: 50, area: '코끝·콧방울(준두·난대·정위)', theme: '재물 수확', score: (m) => zz(m, 'noseWidth'),
    good: '재물운의 정점이라 할 수 있는 시기입니다. 그동안 쌓은 것이 돈이 되어 돌아옵니다.', bad: '들어오는 돈만큼 나가는 돈도 큰 시기입니다. 투자보다 지키는 쪽을 택하세요.' },
  { from: 51, to: 51, area: '인중', theme: '생활 기반과 자녀', score: (m) => zz(m, 'philtrum'),
    good: '인중이 길어 생활 기반이 단단해지는 해입니다. 가족에게 좋은 일이 생깁니다.', bad: '생활의 기반을 점검할 해입니다. 가족과의 대화를 늘리세요.' },
  { from: 52, to: 59, area: '입 주변(법령·식록)', theme: '식록과 노후 준비', score: (m) => zz(m, 'mouthWidth'),
    good: '먹고사는 걱정이 줄어드는 시기입니다. 노후를 위한 기반을 넓히기 좋습니다.', bad: '수입 구조를 다시 짜야 하는 시기입니다. 고정 수입을 늘리는 데 집중하세요.' },
  { from: 60, to: 60, area: '입(수성)', theme: '말과 신용', score: (m) => mix(zz(m, 'mouthWidth'), zz(m, 'lipThickness')),
    good: '말에 무게가 실리는 해입니다. 조언과 가르침으로 존경을 받습니다.', bad: '말 한마디가 오해를 부르기 쉬운 해입니다. 말을 아끼세요.' },
  { from: 61, to: 75, area: '턱(승장·지각·노복)', theme: '인덕과 말년의 기반', score: (m) => mix(zz(m, 'jaw'), zz(m, 'lower')),
    good: '턱이 받쳐 주어 말년이 든든한 시기입니다. 사람과 재물이 곁에 남습니다.', bad: '가진 것을 나누며 관계를 지키는 시기입니다. 인덕이 곧 말년의 재산입니다.' },
  { from: 76, to: 130, area: '턱 아래와 얼굴 전체', theme: '여유와 장수', score: (m) => mix(zz(m, 'lower'), -zz(m, 'asym')),
    good: '얼굴 전체의 기운이 고르게 받쳐 주는 시기입니다. 여유롭고 평안합니다.', bad: '무리하지 않는 것이 곧 복인 시기입니다. 건강을 최우선으로 두세요.' },
];

const MID_TEXT = (z) => `${z.theme}에서 큰 기복 없이 흘러가는 시기입니다. 지금 하는 일을 꾸준히 이어 가면 다음 운으로 자연스럽게 넘어갑니다.`;

/** 세는 나이 (올해 - 태어난 해 + 1) */
export const koreanAge = (birthYear, thisYear = new Date().getFullYear()) => thisYear - birthYear + 1;

export function zoneAt(age) {
  return ZONES.find((z) => age >= z.from && age <= z.to) ?? null;
}

/** 올해와 앞으로 4년의 유년운기 */
export function yearlyFlow(m, birthYear, thisYear = new Date().getFullYear()) {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const age = koreanAge(birthYear, thisYear + i);
    const zone = zoneAt(age);
    if (!zone) {
      out.push({ year: thisYear + i, age, zone: null, grade: 'mid', text: '1~14세는 귀가 운을 맡는 나이라 사진으로 보지 않습니다.' });
      continue;
    }
    const grade = gradeOf(zone.score(m));
    out.push({
      year: thisYear + i,
      age,
      area: zone.area,
      theme: zone.theme,
      range: zone.from === zone.to ? `${zone.from}세` : `${zone.from}~${Math.min(zone.to, 99)}세`,
      grade,
      text: grade === 'mid' ? MID_TEXT(zone) : zone[grade],
    });
  }
  return out;
}

/** 삼정 — 초년(이마)·중년(눈썹~코끝)·말년(인중~턱) */
export function readThirds(m) {
  const parts = [
    ['초년', '15~30세', '이마(상정)', zz(m, 'upper')],
    ['중년', '31~50세', '눈썹~코끝(중정)', zz(m, 'middle')],
    ['말년', '51세 이후', '인중~턱(하정)', zz(m, 'lower')],
  ];
  return parts.map(([name, ages, area, s]) => ({ name, ages, area, grade: gradeOf(s) }));
}

/** 총평: 가장 강한 궁과 가장 약한 궁 */
export function summarize(palaces) {
  const sorted = [...palaces].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted.at(-1);
  return {
    best,
    worst,
    tags: sorted.slice(0, 3).map((p) => p.tag),
    headline: `${josa(best.domain, '이/가')} 가장 빛나는 얼굴`,
    sub: worst.grade === 'bad' ? `${worst.domain}만 챙기면 운이 더 커집니다` : '크게 약한 자리 없이 고른 상입니다',
  };
}
