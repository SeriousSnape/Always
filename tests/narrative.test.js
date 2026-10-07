import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFace, yearlyFlow } from '../src/lib/reading.js';
import { buildBrief, checkNarrative } from '../src/lib/narrative.js';
import { SAMPLE } from '../src/sample/me.js';
import { eyeTypeOf } from '../src/lib/eyes.js';
import { formsOf } from '../src/lib/forms.js';
import { readComplexion, hues, measureComplexion } from '../src/lib/complexion.js';

const opts = { forehead: SAMPLE.forehead, gender: SAMPLE.gender };
const reading0 = readFace(SAMPLE.metrics, opts);
const lead = formsOf(SAMPLE.metrics, reading0.results).lead;
const L = { ...lead.best, name: `${lead.name} · ${lead.best.name}`, shape: lead.best.says, verse: lead.best.says, verseKo: lead.best.reading, traits: [] };
const brief = buildBrief(reading0, yearlyFlow(SAMPLE.metrics, SAMPLE.birthYear, opts, SAMPLE.thisYear), SAMPLE, { eye: L, complexion: readComplexion(SAMPLE.complexion, { month: 10 }) });
const sample = JSON.parse(readFileSync(new URL('../src/sample/narrative.json', import.meta.url)));

test('예시 해설은 출력 검사를 통과한다', () => {
  const r = checkNarrative(sample, brief);
  assert.deepEqual(r.problems, []);
});

test('고민이 없으면 고민 칸을 만들지 않는다', () => {
  const b = buildBrief(readFace(SAMPLE.metrics, opts), [], { ...SAMPLE, worry: '' });
  assert.ok(!b.sections.some((s) => s.key === 'gomin'));
});

test('브리프에는 측정 못한 조건 설명(rest·note)이 들어가지 않는다', () => {
  const text = JSON.stringify(brief);
  assert.ok(!text.includes('정밀 관상'));
  assert.ok(!text.includes('사진으로 보지'));
});

const tamper = (fn) => {
  const o = structuredClone(sample);
  fn(o);
  return checkNarrative(o, brief).problems.map((p) => p.why).join('\n');
};

test('지어낸 원문·한자를 잡는다', () => {
  assert.match(tamper((o) => o.sections[0].quotes.push('印堂明潤 富貴')), /허용 목록에 없는 원문/);
  assert.match(tamper((o) => (o.sections[0].body += ' 印堂明潤')), /근거 없는 한자/);
});

test('등급 낱말과 금지 주제를 잡는다', () => {
  assert.match(tamper((o) => (o.sections[5].body += ' 아주 길한 얼굴이에요.')), /등급 낱말/);
  assert.match(tamper((o) => (o.sections[8].body += ' 화형 얼굴과 궁합이 좋아요.')), /궁합/);
  assert.match(tamper((o) => (o.sections[1].body += ' 개운을 위해 부적을 지니세요.')), /개운/);
});

test('쓴소리 칸에서 흉 직역을 빼거나 바꾸면 잡는다', () => {
  assert.match(
    tamper((o) => {
      const s = o.sections.find((x) => x.key === 'sseunsori');
      s.body = s.body.replace('외롭고 일찍 죽으며 ', '');
    }),
    /흉 직역/,
  );
});

test('칸이 빠지거나 제목이 바뀌면 잡는다', () => {
  assert.match(tamper((o) => o.sections.pop()), /칸이 빠졌다/);
  assert.match(tamper((o) => (o.sections.find((x) => x.key === 'sseunsori').title = '조심할 점')), /제목은/);
});

test('닮은 눈은 길한 뜻의 눈 가운데서만 고른다', () => {
  const shapes = [[2, 2, 2], [-2, -2, -2], [0, 0, 0], [2, -2, 0], [-2, 2, -2]];
  for (const [a, b, c] of shapes) {
    const m = { ...SAMPLE.metrics, eyeAspect: 3 + a * 0.35, eyeSize: 0.17 + b * 0.015, eyeTilt: 0.03 + c * 0.05 };
    const r = eyeTypeOf(m);
    assert.ok(['long', 'bong', 'seobong', 'sang', 'u', 'gwi', 'sa'].includes(r.best.key));
  }
});

test('오관 형은 길한 형 가운데서만 고르고, 사진 5장 기준 대표는 코', () => {
  const f = formsOf(SAMPLE.metrics, reading0.results);
  assert.equal(f.lead.organ, 'nose');
  assert.equal(f.lead.best.key, 'ho');
  for (const o of f.all) assert.ok(o.best.tag);
});

test('흉한 형은 쓴소리 칸 재료가 되고, 직역을 빼면 검사에 걸린다', async () => {
  const { BAD_FORMS } = await import('../src/lib/forms.js');
  const b = { ...BAD_FORMS.mouth.find((x) => x.key === 'megi'), organ: 'mouth', organName: '입' };
  const br = buildBrief(reading0, [], SAMPLE, { badForms: [b] });
  const ss = br.sections.find((s) => s.key === 'sseunsori');
  assert.ok(ss.facts.some((f) => f.id === 'form:mouth:megi' && f.grade === 'bad'));
  const probs = checkNarrative(sample, br).problems.map((p) => p.why).join('\n');
  assert.match(probs, new RegExp(b.t.slice(0, 10)));
});

test('흉한 형은 측정 방식이 정해져 있고, 정면으로 재는 것만 지금 판정한다', async () => {
  const { BAD_FORMS, badFormsOf } = await import('../src/lib/forms.js');
  for (const list of Object.values(BAD_FORMS)) for (const b of list) {
    assert.ok(['front', 'scan', 'image', 'never'].includes(b.how), b.key);
    assert.ok(b.q && b.t, b.key);
    if (b.how === 'front') assert.ok(b.p || b.rule, b.key);
  }
  assert.deepEqual(badFormsOf(SAMPLE.metrics), []);
});

test('기색: 두 뺨 대비 차이로 빛깔을 정하고, 원전에 있는 부위·빛깔 조합만 판정', () => {
  assert.deepEqual(hues({ dL: 0, da: 0, db: 0 }, 'myung'), []);
  assert.ok(hues({ dL: 10, da: 0, db: 0 }, 'myung').includes('明'));
  assert.ok(!hues({ dL: 10, da: 0, db: 0 }, 'jaebaek').includes('明'), '코끝은 원래 밝은 몫을 뺀다');
  const cx = (deltas) => ({ deltas, quality: { ok: true, issues: [] } });
  const r1 = readComplexion(cx({ yeonsu: { dL: -14, da: 0, db: 0, glare: 0 } }), { month: 10 });
  assert.equal(r1.items[0].ref.q, '黑主大病死亡');
  assert.ok(r1.note.q.includes('神旺'));
  // 사계월이 아니면 '연상·수상 누름'은 말하지 않는다
  assert.equal(readComplexion(cx({ yeonsu: { dL: 0, da: 0, db: 8, glare: 0 } }), { month: 10 }).items.length, 0);
  assert.equal(readComplexion(cx({ yeonsu: { dL: 0, da: 0, db: 8, glare: 0 } }), { month: 9 }).items.length, 1);
  // 촬영 검사에 걸리면 판정하지 않는다
  assert.equal(readComplexion({ deltas: {}, quality: { ok: false, issues: ['어두움'] } }).ok, false);
});

test('기색 측정: 한쪽만 밝으면 거부, 고른 빛이면 차이 0', () => {
  const W = 200, H = 200;
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  lm[133] = { x: 0.4, y: 0.4 }; lm[362] = { x: 0.6, y: 0.4 };
  lm[50] = { x: 0.3, y: 0.6 }; lm[280] = { x: 0.7, y: 0.6 };
  const img = (left, right) => {
    const data = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = x < W / 2 ? left : right; const i = (y * W + x) * 4;
      data[i] = v; data[i + 1] = v * 0.8; data[i + 2] = v * 0.7; data[i + 3] = 255;
    }
    return { data, width: W, height: H };
  };
  assert.equal(measureComplexion(img(180, 180), lm).quality.ok, true);
  assert.equal(measureComplexion(img(200, 120), lm).quality.ok, false);
});

test('흉한 기색에는 신(神) 구절이 함께 실려야 한다', () => {
  const comp = { ok: true, items: [{ key: 'yeonsu', region: '연상·수상', hues: ['黑'], grade: 'bad', ref: { q: '黑主大病死亡', s: '麻衣 p165', t: '검으면 큰 병과 죽음이 있다.' } }], note: readComplexion({ deltas: {}, quality: { ok: true } }).note };
  const br = buildBrief(reading0, [], SAMPLE, { complexion: comp });
  const out = structuredClone(sample);
  const g = out.sections.find((s) => s.key === 'gisaek');
  g.body += ' 검으면 큰 병과 죽음이 있다.';
  const why = checkNarrative(out, br).problems.filter((p) => p.key === 'gisaek').map((p) => p.why).join('\n');
  assert.match(why, /신\(神\) 구절/);
});
