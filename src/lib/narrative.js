// 유료 해설 — AI가 쓰되, 판정과 원문은 우리가 정한 것만 쓰게 묶는다 (docs/유료-기획.md §5).
// buildBrief: 기기에서 만든 판정 → AI에게 줄 칸별 재료
// checkNarrative: AI 출력 검사(서버에서 같은 코드로 돌린다)
import { GRADE } from './reading.js';

// ── 해설 14칸 ──
// facts: 이 칸에서 쓸 수 있는 판정 키
export const SECTIONS = [
  { key: 'hanmadi', label: '한마디로', facts: 'summary' },
  { key: 'samjeong', label: '얼굴 세 마디로 보는 인생', facts: ['thirds', 'namak', 'dongseo', 'jungak', 'bukak', 'sangmo'] },
  { key: 'ogwan', label: '눈·코·입이 말하는 것', facts: ['bosu', 'gamchal', 'simbyeon', 'chulnap', 'wuguan'] },
  { key: 'sseunsori', label: '쓴소리 좀 할게', facts: 'bad', fixedTitle: '쓴소리 좀 할게' },
  { key: 'maeryeok', label: '나만의 매력', facts: 'good' },
  { key: 'naraneun', label: '나라는 사람', facts: ['myung', 'gamchal', 'injung'] },
  { key: 'il', label: '나에게 맞는 일', facts: ['gwanrok', 'cheoni', 'chulnap', 'namak'] },
  { key: 'jaemul', label: '재물복', facts: ['jaebaek', 'simbyeon', 'jungak', 'method'] },
  { key: 'yeonae', label: '연애운', facts: ['cheocheop', 'gamchal', 'jilaek'] },
  { key: 'gajok', label: '가족 인연', facts: ['bumo', 'hyungje', 'namnyeo'] },
  { key: 'gyeot', label: '곁에 둘 사람', facts: ['hyungje', 'nobok'] },
  { key: 'olhae', label: '올해의 얼굴', facts: 'yearly' },
  { key: 'gomin', label: '내 고민, 관상으로 보면', facts: 'all', needsWorry: true },
  { key: 'majimak', label: '마지막 한마디', facts: 'summary' },
];

const NAMES = {
  myung: '명궁(인당)', jaebaek: '재백궁(코)', hyungje: '형제궁(눈썹)', jeontaek: '전택궁(두 눈)',
  namnyeo: '남녀궁(눈 밑)', nobok: '노복궁(턱 끝)', cheocheop: '처첩궁(눈꼬리 옆)', jilaek: '질액궁(산근)',
  cheoni: '천이궁(이마 양옆)', gwanrok: '관록궁(이마 가운데)', bokdeok: '복덕궁(이마와 턱)', bumo: '부모궁',
  sangmo: '상모궁(얼굴 전체)', namak: '남악(이마)', dongseo: '동·서악(광대)', jungak: '중악(코)', bukak: '북악(턱)',
  bosu: '보수관(눈썹)', gamchal: '감찰관(눈)', simbyeon: '심변관(코)', chulnap: '출납관(입)', injung: '인중',
  thirds: '삼정(이마·코·턱 세 마디)',
};

const factOf = (id, j) => ({
  id,
  part: NAMES[id] ?? id,
  grade: j.grade,
  look: j.look,
  // 원문은 측정한 조건까지만 인용한 것(q)과 직역(t)만 넘긴다. 측정 못한 조건 설명(rest·note)은 넘기지 않는다.
  quotes: (j.refs ?? []).map(({ q, s, t }) => ({ q, s, t })),
});

/**
 * @param {object} reading readFace() 결과
 * @param {Array} yearly yearlyFlow() 결과
 * @param {{birthYear:number, gender:'m'|'f'|null, worry?:string, thisYear:number}} who
 */
export function buildBrief(reading, yearly, who, { eye = null, badForms = [] } = {}) {
  const all = {};
  for (const [k, j] of Object.entries(reading.results)) {
    if (j.grade !== 'unread') all[k] = factOf(k, j);
  }
  if (reading.thirds.grade !== 'unread') all.thirds = factOf('thirds', reading.thirds);
  all.wuguan = {
    id: 'wuguan', part: '오관 종합', grade: null, look: reading.wuguanSummary.text,
    quotes: reading.wuguanSummary.refs.map(({ q, s, t }) => ({ q, s, t })),
  };
  // 달마상법 총론(얼굴을 열로 나눔, 귀는 눈·재물은 코): 등급 없는 근거
  all.method = {
    id: 'method', part: '달마상법 총론', grade: null, look: '얼굴 부위의 무게를 나누는 법',
    quotes: reading.summary.method.map(({ q, s, t }) => ({ q, s, t })),
  };
  // 닮은 동물형 눈(길한 눈만 후보) — 첫머리 재료
  if (eye) {
    all.eye = {
      id: 'eye', part: `닮은 눈: ${eye.name}(${eye.hanja}, ${eye.tag})`, grade: 'good', look: `${eye.shapeKo}. 측정: ${eye.traits.join(', ')}`,
      quotes: [
        { q: eye.shape, s: eye.page, t: eye.shapeKo },
        { q: eye.verse, s: eye.page, t: eye.verseKo },
      ],
    };
  }
  // 흉한 형(오관 형 판정) — 쓴소리 칸에 원문·직역 그대로
  for (const b of badForms) {
    all[`form:${b.organ}:${b.key}`] = {
      id: `form:${b.organ}:${b.key}`, part: `${b.organName}의 형: ${b.name}(${b.hanja}, ${b.tag})`, grade: 'bad',
      look: `${b.organName}이 원전 그림의 ${b.name}과 닮았다`, quotes: [{ q: b.q, s: `麻衣 ${b.page}`, t: b.t }],
    };
  }
  const judged = Object.values(all).filter((f) => f.grade);
  const pick = (spec) => {
    if (spec === 'bad') return [...judged.filter((f) => f.grade === 'bad'), all.method];
    if (spec === 'good') return judged.filter((f) => f.grade === 'good' && f.id !== 'eye');
    if (spec === 'all') return judged.filter((f) => f.id !== 'eye' && !f.id.startsWith('form:'));
    if (spec === 'summary') {
      const s = reading.summary;
      return [...judged.filter((f) => f.id === 'eye' || f.id === s.best?.key || f.id === s.worst?.key || f.id === 'gamchal' || f.id === 'jaebaek'), all.method];
    }
    if (spec === 'yearly') return [];
    return spec.map((k) => all[k]).filter(Boolean);
  };
  const worry = (who.worry ?? '').trim().slice(0, 300);
  const sections = SECTIONS.filter((s) => !s.needsWorry || worry).map((s) => ({
    key: s.key,
    label: s.label,
    fixedTitle: s.fixedTitle ?? null,
    facts: pick(s.facts),
  }));
  const olhae = sections.find((s) => s.key === 'olhae');
  if (olhae) {
    olhae.years = yearly.map((y) => ({ year: y.year, age: y.age, area: y.area, grade: y.grade, look: y.look }));
    // 올해 자리의 원문(앞으로 4년 중 처음 나오는 자리까지)
    const seen = new Set();
    for (const y of yearly) {
      if (y.grade === 'unread' || seen.has(y.area)) continue;
      seen.add(y.area);
      olhae.facts.push(factOf(`zone:${y.year}`, y));
      olhae.facts.at(-1).part = `${y.year}년 ${y.age}세 자리: ${y.area}`;
    }
  }
  return {
    person: {
      name: who.name ?? null,
      birthYear: who.birthYear,
      gender: who.gender === 'm' ? '남' : who.gender === 'f' ? '여' : '모름',
      age: who.thisYear - who.birthYear + 1,
      thisYear: who.thisYear,
    },
    worry: worry || null,
    overall: { grade: reading.summary.grade, goods: reading.summary.goods, bads: reading.summary.bads },
    sections,
  };
}

// ── AI에게 주는 지시 ──
export const SYSTEM_PROMPT = `너는 관상 해설가다. 『增補麻衣相法全編』과 『相理衡眞』 권3 두 책만을 근거로, 이미 내려진 판정을 한 사람에게 읽기 좋은 해설로 풀어 준다.

판정은 사진 측정으로 기기에서 이미 끝났다. 너의 일은 판정을 바꾸는 것이 아니라, 그 판정이 이 사람의 삶에서 무슨 뜻인지 재미있고 또렷하게 들려주는 것이다. 사용자는 돈을 내고 이 글을 읽는다. 끝까지 읽고 싶고, 친구에게 캡처해서 보내고 싶은 글이어야 한다.

말투: 해요체. person.name이 있으면 '○○님'으로 부른다. 다정하지만 아부하지 않는다. 짧은 문장. 전문 용어는 처음 나올 때 괄호로 쉬운 말을 붙인다.

칸마다 쓰는 것
- title: 그 칸의 핵심을 한 줄로(30자 이내). 궁금해서 펼치고 싶게. fixedTitle이 있으면 그대로 쓴다.
- body: 그 칸의 facts만 가지고 쓴다(120~500자, sseunsori·gomin은 1000자까지). grade가 null인 fact는 판정이 아니라 총론 근거다. facts에 없는 부위·판정은 말하지 않는다. 측정하지 않은 것(귀, 눈빛, 목소리, 기색 등)이 있다는 말도 하지 않는다.
- eye fact(닮은 동물형 눈)가 있으면 hanmadi는 그 눈으로 시작한다. 원전의 길한 뜻만 골라 둔 것이니 가장 긍정적으로, 자랑하고 싶게 풀어 준다.
- quotes: 그 칸 facts의 quotes[].q 가운데 본문에서 다룬 것을 글자 그대로 1~2개. 없으면 빈 배열.

지킬 것
1. 등급을 말로 매기지 않는다. 길·흉 표시는 화면이 판정에서 직접 붙인다. 본문에 '길하다/흉하다/吉/凶' 같은 등급 낱말을 쓰지 않는다(아래 직역 안에 든 경우는 예외).
2. 판정과 반대되는 방향으로 쓰지 않는다. grade가 bad인 부위를 좋게 포장하지 않고, good인 부위를 깎아내리지 않는다. mid는 짧게, 지어내지 않는다.
3. 한자는 facts의 quotes[].q에 있는 것만 쓴다. 원문을 새로 만들거나 바꾸지 않는다.
4. sseunsori 칸: 모든 bad 판정을 다룬다. 각각 직역(quotes[].t)을 본문에 글자 그대로 넣고, 그 뒤에 이 사람이 받아들일 수 있게 풀어 준다. 원문의 뜻을 무르거나 '사실은 괜찮다'로 뒤집지 않는다. 다만 관상은 한 부위로 정해지지 않는다는 원전의 태도(여러 부위를 함께 본다)를 덧붙일 수 있다.
5. olhae 칸: years의 나이·자리·판정 순서대로 올해와 앞으로를 말한다. 나이는 세는 나이다.
6. gomin 칸: worry를 facts와 연결하되, 관상이 답할 수 없는 부분은 답하는 척하지 않는다.
7. 쓰지 않는 것: 오행형(목형·화형 등) 얼굴 분류, 두 사람 궁합, 개운법·부적·성형 권유, 사주, 질병 진단·의료·법률 조언, 사람을 단정하는 혐오 표현.
8. 성별에 따라 원문이 다른 경우는 facts에 이미 반영돼 있다. 따로 성별 고정관념을 덧붙이지 않는다.

followups: 이 사람이 다 읽고 나서 더 묻고 싶을 만한 질문 3개(각 40자 이내, 이 사람의 판정과 고민에 맞춰서).`;

export const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: SECTIONS.map((s) => s.key) },
          title: { type: 'string' },
          body: { type: 'string' },
          quotes: { type: 'array', items: { type: 'string' } },
        },
        required: ['key', 'title', 'body', 'quotes'],
        additionalProperties: false,
      },
    },
    followups: { type: 'array', items: { type: 'string' } },
  },
  required: ['sections', 'followups'],
  additionalProperties: false,
};

export const userMessage = (brief) =>
  `아래 판정으로 해설을 써 줘. sections는 brief.sections의 순서와 key 그대로.\n\n${JSON.stringify(brief, null, 2)}`;

// ── 출력 검사 ──
const HANJA_RUN = /[㐀-鿿]{2,}/g;
const FORBIDDEN = [
  [/오행|[목화토금수]형\s?(얼굴|인|체질)/, '오행형 분류'],
  [/궁합/, '궁합'],
  [/개운|부적|성형/, '개운·성형 권유'],
  [/사주|팔자|대운/, '사주'],
  [/진단|치료|처방|병원/, '의료'],
  [/왕기|왕이 될 상/, '왕기 판정'],
];
const GRADE_WORDS = /吉|凶|길하|흉하|길한|흉한|길해|흉해|대길|대흉|길상|흉상/;

/**
 * @returns {{ok:boolean, problems:Array<{key:string, why:string}>}}
 *  key별로 모아서, 어긋난 칸만 다시 생성한다.
 */
export function checkNarrative(output, brief) {
  const problems = [];
  const add = (key, why) => problems.push({ key, why });
  const want = brief.sections.map((s) => s.key);
  const got = (output?.sections ?? []).map((s) => s.key);
  for (const k of want) if (!got.includes(k)) add(k, '칸이 빠졌다');
  for (const k of got) if (!want.includes(k)) add(k, '없어야 할 칸이다');

  const allQ = brief.sections.flatMap((s) => s.facts.flatMap((f) => f.quotes.map((q) => q.q)));
  const parts = brief.sections.flatMap((s) => s.facts.map((f) => f.part));
  const hanjaOk = [...allQ, ...parts, ...Object.values(NAMES)].join('|');

  for (const sec of output?.sections ?? []) {
    const spec = brief.sections.find((s) => s.key === sec.key);
    if (!spec) continue;
    const secQ = spec.facts.flatMap((f) => f.quotes);
    const qs = new Set(secQ.map((q) => q.q));
    if (spec.fixedTitle && sec.title !== spec.fixedTitle) add(sec.key, `제목은 「${spec.fixedTitle}」여야 한다`);
    if ([...sec.title].length > 30) add(sec.key, '제목이 30자를 넘는다');
    const len = [...sec.body].length;
    const max = sec.key === 'sseunsori' || sec.key === 'gomin' ? 1400 : 700;
    if (len < 60 || len > max) add(sec.key, `본문 길이 ${len}자`);
    for (const q of sec.quotes) if (!qs.has(q)) add(sec.key, `허용 목록에 없는 원문: ${q}`);
    for (const run of sec.body.match(HANJA_RUN) ?? []) {
      if (!hanjaOk.includes(run)) add(sec.key, `근거 없는 한자: ${run}`);
    }
    for (const [re, what] of FORBIDDEN) if (re.test(sec.body) || re.test(sec.title)) add(sec.key, `금지 주제: ${what}`);
    // 등급 낱말: 직역 안에 든 것은 빼고 본다
    let plain = sec.body;
    for (const q of secQ) plain = plain.split(q.t).join('');
    if (GRADE_WORDS.test(plain) || GRADE_WORDS.test(sec.title)) add(sec.key, '등급 낱말을 직접 썼다');
    if (sec.key === 'sseunsori') {
      for (const f of spec.facts) {
        if (f.grade !== 'bad') continue;
        for (const q of f.quotes) {
          if (!sec.body.includes(q.t)) add(sec.key, `흉 직역이 그대로 들어가지 않았다: ${q.t}`);
        }
      }
    }
  }
  if ((output?.followups ?? []).length !== 3) add('followups', '후속 질문은 3개');
  return { ok: problems.length === 0, problems };
}

export const gradeChip = (g) => GRADE[g] ?? null;
