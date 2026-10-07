import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSaju } from '../src/lib/saju.js';
import { BASE, poseIssue } from '../src/lib/physiognomy.js';
import { bridgeReading } from '../src/lib/bridge.js';
import { bearing, directionOf, evaluateLocation, readExifGps, CITIES } from '../src/lib/location.js';
import { compatibility, toPerson, encodePerson, decodePerson } from '../src/lib/compat.js';

const avg = () => Object.fromEntries(Object.entries(BASE).map(([k, [mu]]) => [k, mu]));

test('정면 판정', () => {
  assert.equal(poseIssue({ yaw: 0.01, roll: 2 }), null);
  assert.ok(poseIssue({ yaw: 0.2, roll: 0 }));
});

test('관상×사주 브릿지', () => {
  const s = computeSaju({ year: 1995, month: 8, day: 20, hour: 9 });
  const b = bridgeReading(s.lacking, s);
  assert.ok(b.notes.some((n) => n.includes('빈자리')));
});

test('방위: 서울→부산은 남동, 서울→강릉은 동', () => {
  const [seoul, busan] = CITIES;
  const gangneung = CITIES.find((c) => c.name === '강릉');
  assert.equal(directionOf(bearing(seoul, busan)).name, '남동');
  assert.equal(directionOf(bearing(seoul, gangneung)).name, '동');
});

test('위치 풀이: 부족 오행 방향은 점수가 높다', () => {
  const saju = { lacking: 0, excess: null, dayElement: 0 };
  const seoul = CITIES[0];
  const east = { lat: 37.5665, lon: 128.5 };
  const west = { lat: 37.5665, lon: 125.5 };
  const today = new Date(2000, 0, 7); // 갑자일(수)
  const e = evaluateLocation({ origin: seoul, here: east, saju, faceEl: null, today });
  const w = evaluateLocation({ origin: seoul, here: west, saju, faceEl: null, today });
  assert.equal(e.direction.name, '동');
  assert.equal(e.score, 3);
  assert.equal(e.verdict.label, '대길');
  assert.equal(w.score, -1);
  const near = evaluateLocation({ origin: seoul, here: { lat: 37.567, lon: 126.979 }, saju, faceEl: null, today });
  assert.equal(near.direction.name, '중앙');
});

function jpegWithGps(lat, lon, le = false) {
  // TIFF: header(8) + IFD0(1 entry) + GPS IFD(4 entries) + rationals
  const buf = new ArrayBuffer(200);
  const v = new DataView(buf);
  const t = 12; // TIFF 시작 오프셋
  v.setUint16(0, 0xffd8);
  v.setUint16(2, 0xffe1);
  v.setUint16(4, 180);
  v.setUint32(6, 0x45786966);
  v.setUint16(t, le ? 0x4949 : 0x4d4d);
  v.setUint16(t + 2, 42, le);
  v.setUint32(t + 4, 8, le);
  v.setUint16(t + 8, 1, le);
  v.setUint16(t + 10, 0x8825, le);
  v.setUint16(t + 12, 4, le);
  v.setUint32(t + 14, 1, le);
  v.setUint32(t + 18, 26, le);
  let e = t + 26;
  v.setUint16(e, 4, le);
  e += 2;
  const ent = (tag, type, cnt, val) => {
    v.setUint16(e, tag, le);
    v.setUint16(e + 2, type, le);
    v.setUint32(e + 4, cnt, le);
    if (type === 2) v.setUint8(e + 8, val.charCodeAt(0));
    else v.setUint32(e + 8, val, le);
    e += 12;
  };
  const latOff = 80;
  const lonOff = 104;
  ent(1, 2, 2, lat < 0 ? 'S' : 'N');
  ent(2, 5, 3, latOff);
  ent(3, 2, 2, lon < 0 ? 'W' : 'E');
  ent(4, 5, 3, lonOff);
  const rat = (off, deg) => {
    const a = Math.abs(deg);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    const s = Math.round(((a - d) * 60 - m) * 60 * 100);
    [[d, 1], [m, 1], [s, 100]].forEach(([n, den], i) => {
      v.setUint32(t + off + i * 8, n, le);
      v.setUint32(t + off + i * 8 + 4, den, le);
    });
  };
  rat(latOff, lat);
  rat(lonOff, lon);
  return buf;
}

test('EXIF GPS 파싱 (빅/리틀 엔디언)', () => {
  for (const le of [false, true]) {
    const g = readExifGps(jpegWithGps(37.5665, 126.978, le));
    assert.ok(Math.abs(g.lat - 37.5665) < 1e-3 && Math.abs(g.lon - 126.978) < 1e-3, JSON.stringify(g));
  }
  assert.equal(readExifGps(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer), null);
});

test('궁합 점수 범위와 공유 코드 왕복', () => {
  const a = toPerson('민지', computeSaju({ year: 1998, month: 3, day: 2, hour: 10 }), 0);
  const b = toPerson('준호', computeSaju({ year: 1997, month: 11, day: 21, hour: null }), null);
  const c = compatibility(a, b);
  assert.ok(c.score >= 5 && c.score <= 99);
  assert.deepEqual(decodePerson(encodePerson(a)), a);
  assert.equal(decodePerson('garbage!!'), null);
});

test('웃는 얼굴·벌린 입은 다시 찍도록 안내', () => {
  assert.ok(poseIssue({ yaw: 0, roll: 0 }, { smile: 0.8, jawOpen: 0 }));
  assert.ok(poseIssue({ yaw: 0, roll: 0 }, { smile: 0, jawOpen: 0.5 }));
  assert.equal(poseIssue({ yaw: 0, roll: 0 }, { smile: 0.1, jawOpen: 0.05 }), null);
});

test('조사 자동 선택', async () => {
  const { josa } = await import('../src/lib/josa.js');
  assert.equal(josa('수아', '이/가'), '수아가');
  assert.equal(josa('민준', '이/가'), '민준이');
  assert.equal(josa('Tom', '은/는'), 'Tom은(는)');
});


test('원전 판정: 평균 얼굴은 대부분 평, 모든 판정에 원문 출처', async () => {
  const r = await import('../src/lib/reading.js');
  const res = r.readFace(avg(), { forehead: { status: 'covered', reason: '앞머리가 이마를 가리고 있어요', thirds: null } });
  assert.equal(res.palaces.length, 13);
  assert.equal(res.wuguan.find((w) => w.key === 'chaecheong').grade, 'unread');
  for (const p of [...res.palaces, ...res.wuyue, ...res.wuguan]) {
    for (const ref of p.refs) assert.match(ref.s, /^(麻衣|衡眞)/);
    if (p.grade === 'good' || p.grade === 'bad') assert.ok(p.refs.length > 0, p.key);
  }
  // 이마가 가려지면 삼정은 판정하지 않고 이유를 말한다
  assert.equal(res.thirds.grade, 'unread');
  assert.match(res.thirds.look, /앞머리/);
  assert.match(res.palaces.find((p) => p.key === 'gwanrok').note, /이마가 드러나지 않아/);
});

test('원전 판정: 형상에 따라 원문이 바뀐다', async () => {
  const r = await import('../src/lib/reading.js');
  const m = avg();
  const narrow = r.readFace({ ...m, browGap: 0.7 }).palaces.find((p) => p.key === 'myung');
  assert.equal(narrow.grade, 'bad');
  assert.match(narrow.refs[0].q, /眉接交加/);
  const wideF = r.readFace({ ...m, foreheadW: 0.9, chinW: 0.13 }).palaces.find((p) => p.key === 'bokdeok');
  assert.match(wideF.refs[0].q, /額闊頦尖/);
  const eyes = r.readFace({ ...m, eyeTilt: 0.15, eyeTiltL: 0.15, eyeTiltR: 0.15 }).wuguan.find((w) => w.key === 'gamchal');
  assert.ok(eyes.refs.some((x) => /目尾朝天/.test(x.q)));
  const mouthM = r.readFace({ ...m, mouthWidth: 0.42 }, { gender: 'm' }).wuguan.find((w) => w.key === 'chulnap');
  assert.ok(mouthM.refs.some((x) => /男人口闊/.test(x.q)));
  const mouthF = r.readFace({ ...m, mouthWidth: 0.42 }, { gender: 'f' }).wuguan.find((w) => w.key === 'chulnap');
  assert.ok(mouthF.refs.some((x) => /女人口闊/.test(x.q)));
  const parents = r.readFace({ ...m, browAsym: 0.2 }).palaces.find((p) => p.key === 'bumo');
  assert.match(parents.refs[0].q, /左眉高右眉低/);
});

test('삼정: 이마가 드러나면 머리선 기준으로 판정', async () => {
  const r = await import('../src/lib/reading.js');
  const even = r.judgeThirds({ status: 'visible', thirds: { upper: 0.33, middle: 0.34, lower: 0.33 } });
  assert.equal(even.grade, 'good');
  assert.match(even.refs[0].q, /三停平等/);
  const uneven = r.judgeThirds({ status: 'visible', thirds: { upper: 0.25, middle: 0.33, lower: 0.42 } });
  assert.equal(uneven.grade, 'bad');
});

test('유년운기: 원전 나이표, 男左女右, 측정 불가 자리', async () => {
  const r = await import('../src/lib/reading.js');
  for (let age = 1; age <= 150; age++) assert.ok(r.zoneAt(age), `age ${age}`);
  assert.equal(r.zoneAt(28).area, '인당');
  assert.equal(r.zoneAt(41).area, '산근');
  assert.equal(r.zoneAt(48).area, '준두');
  assert.equal(r.zoneAt(60).area, '수성(입)');
  assert.equal(r.zoneAt(71).area, '지각');
  const m = { ...avg(), eyeTiltL: 0.15, eyeTiltR: -0.06 };
  const z = r.zoneAt(36);
  assert.equal(r.judgeZone(z, m, { gender: 'm' }).grade, 'good'); // 남자는 왼쪽 눈
  assert.equal(r.judgeZone(z, m, { gender: 'f' }).grade, 'bad'); // 여자는 오른쪽 눈
  assert.equal(r.judgeZone(r.zoneAt(10), m).grade, 'unread'); // 귀
  assert.equal(r.judgeZone(r.zoneAt(19), m, { forehead: { status: 'covered', reason: 'x' } }).grade, 'unread');
  const flow = r.yearlyFlow(avg(), 1985, {}, 2026);
  assert.equal(flow[0].age, 42);
  assert.equal(flow.length, 5);
});

test('이마 노출 판별: 앞머리·머리선·잘린 사진', async () => {
  const { analyzeForehead } = await import('../src/lib/forehead.js');
  const W = 200;
  const H = 300;
  // 정면 얼굴 랜드마크 (필요한 점만)
  const lm = [];
  const set = (i, x, y) => (lm[i] = { x: x / W, y: y / H });
  for (let i = 0; i < 468; i++) lm[i] = { x: 0.5, y: 0.5 };
  set(33, 70, 150); set(263, 130, 150); set(105, 80, 135); set(334, 120, 135);
  set(10, 100, 95); set(2, 100, 190); set(152, 100, 245); set(234, 50, 160); set(454, 150, 160);
  const maskWith = (hairBelow) => {
    const m = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y < hairBelow) m[y * W + x] = 1;
    return m;
  };
  // 머리선이 메시 위(y=70)에 있으면 이마가 드러남
  const vis = analyzeForehead(maskWith(70), W, H, lm);
  assert.equal(vis.status, 'visible');
  assert.ok(vis.thirds.upper > 0.3 && vis.thirds.upper < 0.4, JSON.stringify(vis.thirds));
  // 앞머리가 눈썹 바로 위(y=120)까지 내려오면 가림
  assert.equal(analyzeForehead(maskWith(120), W, H, lm).status, 'covered');
  // 머리카락이 전혀 없으면 머리선을 못 찾음
  assert.equal(analyzeForehead(maskWith(0), W, H, lm).status, 'unclear');
});

test('관상도: 원전 자리 표시, 이마가 가려지면 상정을 빗금 처리', async () => {
  const { buildFaceChart } = await import('../src/chart.js');
  const r = await import('../src/lib/reading.js');
  const m = avg();
  const covered = { status: 'covered', reason: 'x', thirds: null };
  const res = r.readFace(m, { forehead: covered });
  for (const mode of ['palace', 'yearly']) {
    const c = buildFaceChart({ metrics: m, mode, palaces: res.palaces, zones: r.zoneGrades(m, { forehead: covered }), now: { year: 2026, age: 42 }, forehead: covered });
    assert.ok(!c.svg.includes('NaN'));
    assert.match(c.svg, /상정 불명확/);
  }
  const vis = buildFaceChart({ metrics: m, mode: 'palace', palaces: res.palaces, zones: [], now: null, forehead: { status: 'visible', thirds: { upper: 0.33, middle: 0.33, lower: 0.34 } } });
  assert.doesNotMatch(vis.svg, /상정 불명확/);
});

test('측정값 기여: 보내는 값에 사진·좌표 없음, 지표는 이름:값', async () => {
  const { buildPayload, METRIC_KEYS, ageBandOf } = await import('../src/lib/contribute.js');
  const fs = await import('node:fs');
  const sql = fs.readdirSync(new URL('../supabase/migrations/', import.meta.url)).map((f) => fs.readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8')).join('\n');
  const p = buildPayload({ metrics: avg(), forehead: { status: 'visible', thirds: { upper: 0.3, middle: 0.33, lower: 0.37 } }, gender: 'f', ageBand: '30대', device: 'abc' });
  assert.deepEqual(Object.keys(p).sort(), ['ageBand', 'device', 'forehead', 'gender', 'metrics', 'thirds', 'v']);
  assert.deepEqual(Object.keys(p.metrics), METRIC_KEYS);
  const { CX_KEYS } = await import('../src/lib/contribute.js');
  const p2 = buildPayload({ metrics: avg(), forehead: null, gender: '', ageBand: '', device: 'abc', complexion: { quality: { ok: true }, deltas: { myung: { dL: 1, da: 2, db: 3 } } } });
  assert.equal(p2.metrics.cxMyungL, 1);
  assert.ok([...METRIC_KEYS, ...CX_KEYS].length <= 100);
  assert.ok(CX_KEYS.every((k) => /^[A-Za-z0-9]{1,32}$/.test(k)));
  assert.ok(METRIC_KEYS.every((k) => /^[A-Za-z0-9]{1,32}$/.test(k)), 'SQL 함수의 지표 이름 규칙');
  assert.ok(METRIC_KEYS.length <= 100);
  assert.match(sql, new RegExp(`\\(p->>'v'\\) is distinct from '${p.v}'`), 'SQL 함수 버전 일치');
  assert.equal(ageBandOf(1995, 2026), '30대');
  assert.equal(ageBandOf(null), '');
});

test('보정 계산: 기기별 평균, 남녀 분리, 반복성', async () => {
  const { parseCsv, calibrate } = await import('../src/lib/calibration.js');
  let csv = 'received_at,v,device,gender,browGap\n';
  // 5명, 각 3번씩: 사람 간 차이는 크고 같은 사람 안 흔들림은 작다
  for (let p = 0; p < 5; p++) for (let k = 0; k < 3; k++) csv += `t,1,d${p},${p < 3 ? 'm' : 'f'},${0.8 + p * 0.05 + k * 0.001}\n`;
  const rows = parseCsv(csv);
  assert.equal(rows.length, 15);
  const r = calibrate(rows, ['browGap']).browGap;
  assert.equal(r.all.n, 5);
  assert.equal(r.m.n, 3);
  assert.ok(r.repeat.icc > 0.9);
});

test('같은 눈썹을 보수관·형제궁이 각자 자기 원문으로 판정, 측정 못 한 조건은 설명', async () => {
  const r = await import('../src/lib/reading.js');
  const res = r.readFace({ ...avg(), browEye: 0.39, browEyeL: 0.39, browEyeR: 0.39 });
  const hy = res.palaces.find((p) => p.key === 'hyungje');
  const bo = res.wuguan.find((w) => w.key === 'bosu');
  assert.equal(hy.grade, 'bad');
  assert.match(hy.refs[0].q, /塞眼/);
  assert.ok(!bo.refs.some((x) => /塞眼/.test(x.q)), '보수관이 형제궁 원문을 빌려 쓰지 않음');
  const ji = r.readFace({ ...avg(), bridgeDepth: 0.2 }).palaces.find((p) => p.key === 'jilaek');
  const ref = ji.refs.find((x) => /山根連鼻梁/.test(x.q));
  assert.doesNotMatch(ref.q, /與額平/); // 재지 않은 조건은 인용하지 않고
  assert.match(ref.rest, /與額平/); // 설명으로 돌린다
  assert.match(ref.rest, /정밀 관상/);
});
