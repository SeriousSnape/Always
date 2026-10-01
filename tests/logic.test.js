import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSaju } from '../src/lib/saju.js';
import { BASE, faceElement, readFeatures, poseIssue } from '../src/lib/physiognomy.js';
import { bridgeReading } from '../src/lib/bridge.js';
import { bearing, directionOf, evaluateLocation, readExifGps, CITIES } from '../src/lib/location.js';
import { compatibility, toPerson, encodePerson, decodePerson } from '../src/lib/compat.js';

const avg = () => Object.fromEntries(Object.entries(BASE).map(([k, [mu]]) => [k, mu]));

test('얼굴 오행형: 긴 얼굴은 목형, 둥근 얼굴은 수형, 각진 턱은 금형', () => {
  assert.equal(faceElement({ ...avg(), aspect: 1.32, jaw: 0.74 }), 0);
  assert.equal(faceElement({ ...avg(), aspect: 1.02 }), 4);
  assert.equal(faceElement({ ...avg(), jaw: 0.85 }), 3);
});

test('부위별 해석 5개, 정면 판정', () => {
  assert.equal(readFeatures(avg()).length, 5);
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

test('왕기 지수: 평균 얼굴은 60점 전후, 같은 측정값이면 같은 결과, 저장된 옛 데이터(asym 없음)도 동작', async () => {
  const { kingScore, kingVerdict } = await import('../src/lib/king.js');
  const m = avg();
  assert.ok(Math.abs(kingScore(m) - 60) <= 10, String(kingScore(m)));
  assert.deepEqual(kingVerdict(m), kingVerdict({ ...m }));
  const { asym, ...old } = m;
  assert.ok(Number.isFinite(kingScore(old)));
  assert.ok(kingVerdict({ ...m, asym: 0.005, noseLength: 0.35, jaw: 0.82, eyeTilt: 0.1 }).isKing);
});

test('왕기 분포: 측정값이 기준 분포를 따르면 왕은 소수(2~15%)', async () => {
  const { kingVerdict } = await import('../src/lib/king.js');
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());
  let kings = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const m = Object.fromEntries(Object.entries(BASE).map(([k, [mu, sd]]) => [k, mu + sd * gauss()]));
    if (kingVerdict(m).isKing) kings++;
  }
  assert.ok(kings / N > 0.02 && kings / N < 0.15, `왕 비율 ${kings / N}`);
});

test('십이궁·유년운기·삼정·총평', async () => {
  const r = await import('../src/lib/reading.js');
  const m = avg();
  const palaces = r.readPalaces(m);
  assert.equal(palaces.length, 10);
  assert.ok(palaces.every((p) => p.grade === 'mid' && p.text));
  // 콧대·콧방울이 크면 재백궁 길, 주의 궁에는 개운법
  const rich = r.readPalaces({ ...m, noseLength: 0.34, noseWidth: 0.27, browGap: 0.7 });
  assert.equal(rich.find((p) => p.key === 'jaebaek').grade, 'good');
  const myung = rich.find((p) => p.key === 'myung');
  assert.equal(myung.grade, 'bad');
  assert.ok(myung.tip);
  const s = r.summarize(rich);
  assert.equal(s.best.key, 'jaebaek');
  assert.equal(s.headline, '재물이 가장 빛나는 얼굴');
  // 세는 나이: 2026년에 1985년생은 42세 → 산근
  assert.equal(r.koreanAge(1985, 2026), 42);
  const flow = r.yearlyFlow(m, 1985, 2026);
  assert.equal(flow.length, 5);
  assert.match(flow[0].area, /산근/);
  assert.match(flow[3].area, /콧대/); // 45세
  assert.equal(r.yearlyFlow(m, 2015, 2026)[0].zone, null); // 12세
  assert.equal(r.readThirds(m).length, 3);
  // 경계 나이 모두 자리 있음
  for (let age = 15; age <= 110; age++) assert.ok(r.zoneAt(age), `age ${age}`);
});
