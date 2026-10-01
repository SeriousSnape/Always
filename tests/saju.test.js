import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSaju, solarLongitude, dayPillarOf, julianDayNumber } from '../src/lib/saju.js';

test('일진: 2000-01-07은 갑자일, 2000-01-01은 무오일', () => {
  assert.equal(dayPillarOf(new Date(2000, 0, 7)).name, '갑자');
  assert.equal(dayPillarOf(new Date(2000, 0, 1)).name, '무오');
});

test('JDN 기준값', () => {
  assert.equal(julianDayNumber(2000, 1, 1), 2451545);
});

test('태양 황경: 춘분(2024-03-20 03:06 UTC) ≈ 0°', () => {
  const l = solarLongitude(Date.UTC(2024, 2, 20, 3, 6));
  assert.ok(l < 0.05 || l > 359.95, `λ=${l}`);
});

test('입춘 경계: 2024-02-04 17:27 KST 전후로 연주·월주가 바뀐다', () => {
  const before = computeSaju({ year: 2024, month: 2, day: 4, hour: 16, minute: 0 });
  const after = computeSaju({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 });
  assert.equal(before.pillars.year.name, '계묘');
  assert.equal(before.pillars.month.name, '을축');
  assert.equal(after.pillars.year.name, '갑진');
  assert.equal(after.pillars.month.name, '병인');
});

test('1999년 12월~2000년 1월 초는 기묘년 병자월', () => {
  const s = computeSaju({ year: 2000, month: 1, day: 1, hour: 12 });
  assert.equal(s.pillars.year.name, '기묘');
  assert.equal(s.pillars.month.name, '병자');
  assert.equal(s.pillars.day.name, '무오');
  assert.equal(s.animal, '토끼');
});

test('시주: 무오일 정오(진태양시 보정 후 11:3x) → 무오일 戊午時', () => {
  const s = computeSaju({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
  assert.equal(s.pillars.hour.name, '무오');
});

test('시간 모르면 시주 없음, 오행 6글자', () => {
  const s = computeSaju({ year: 1990, month: 5, day: 15, hour: null });
  assert.equal(s.pillars.hour, null);
  assert.equal(s.counts.reduce((a, b) => a + b), 6);
});

test('23시 이후 자시는 다음 날 일진 (옵션)', () => {
  const late = computeSaju({ year: 2000, month: 1, day: 6, hour: 23, minute: 50 });
  assert.equal(late.pillars.day.name, '갑자');
  assert.equal(late.pillars.hour.name, '갑자');
  const noShift = computeSaju({ year: 2000, month: 1, day: 6, hour: 23, minute: 50, lateZiNextDay: false });
  assert.equal(noShift.pillars.day.name, '계해');
});

test('진태양시: 서울 00:20 출생은 전날 자시로 계산', () => {
  const s = computeSaju({ year: 2000, month: 1, day: 7, hour: 0, minute: 20 });
  // 00:20 KST → 서울 진태양시 23:48 (1월 6일) → 23시 이후 규칙으로 1월 7일 갑자일
  assert.equal(s.pillars.day.name, '갑자');
  assert.equal(s.pillars.hour.branch, 0);
});
