import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveDepth, profileMetrics } from '../src/lib/scan.js';

// MediaPipe 표준 얼굴 모델(468점, 실제 3D)로 고개 돌린 장면을 만들어 깊이를 되찾는지 본다
const V = readFileSync(new URL('./fixtures-canonical.obj', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.startsWith('v ')).map((l) => l.split(/\s+/).slice(1, 4).map(Number));
const W = 720, H = 960;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);

function frame(deg, { noise = 0.15, zScale = 0.5 } = {}) {
  const th = (deg * Math.PI) / 180;
  const s = 20; // 화면 크기
  return {
    w: W, h: H,
    landmarks: V.map(([x, y, z]) => {
      const xr = x * Math.cos(th) + z * Math.sin(th);
      return {
        x: (360 + s * xr + noise * rnd()) / W,
        y: (480 - s * y + noise * rnd()) / H,
        // 정면 한 장의 깊이 추정은 부정확하다고 가정(크기 절반 + 잡음)
        z: -(zScale * s * z + 3 * rnd()) / W,
      };
    }),
  };
}

const truth = (() => {
  // 정답: 표준 모델의 실제 깊이로 같은 지표
  const unit = Math.hypot(V[133][0] - V[362][0], V[133][1] - V[362][1]);
  const X = V.map((v) => v[0] / unit), Y = V.map((v) => -v[1] / unit), D = V.map((v) => v[2] / unit);
  return profileMetrics({ X, Y, D });
})();

test('고개 돌리기 스캔: 여러 각도에서 깊이를 되찾는다', () => {
  const frontal = [frame(0), frame(1), frame(-1)];
  const turned = [-30, -25, -20, -15, 15, 20, 25, 30].map((d) => frame(d));
  const r = solveDepth(frontal, turned);
  assert.ok(r);
  // 각도를 맞게 찾았는지
  r.angles.forEach((a, i) => assert.ok(Math.abs(a - [-30, -25, -20, -15, 15, 20, 25, 30][i]) < 3, `angle ${a}`));
  const got = profileMetrics(r);
  for (const k of ['scanNoseHeight', 'scanRadix', 'scanBridgeMid', 'scanEyeProt', 'scanChin']) {
    assert.ok(Math.abs(got[k] - truth[k]) < 0.06, `${k}: ${got[k].toFixed(3)} vs ${truth[k].toFixed(3)}`);
  }
});

test('정면 한 장 깊이(시작값)보다 스캔이 정답에 가깝다', () => {
  const frontal = [frame(0)];
  const turned = [-25, -18, 18, 25].map((d) => frame(d));
  const r = solveDepth(frontal, turned);
  const start = solveDepth(frontal, turned, 0);
  const err = (m) => Math.abs(m.scanNoseHeight - truth.scanNoseHeight) + Math.abs(m.scanRadix - truth.scanRadix);
  assert.ok(err(profileMetrics(r)) < err(profileMetrics(start)) / 3);
});

test('3장 스캔: 정면 + 양쪽 25도, 같은 방향은 한 번만', async () => {
  const { binFor, yawDeg, quickYaw, ANGLE_BINS } = await import('../src/lib/scan.js');
  assert.deepEqual(ANGLE_BINS, [-25, 25]);
  const filled = new Set();
  for (const d of [10, 24, 26, -27, 30, -10]) {
    const b = binFor(d, filled);
    if (b !== null) filled.add(b);
  }
  assert.deepEqual([...filled].sort((a, b) => a - b), [-25, 25]);
  for (const d of [10, 20, 30]) assert.ok(Math.abs(yawDeg(quickYaw(frame(d).landmarks)) - d) < 1.5);
});

test('3장(각 5프레임 연사)으로도 깊이를 되찾는다', () => {
  const fr = Array.from({ length: 5 }, () => frame(0));
  const tu = [-25, 25].flatMap((a) => Array.from({ length: 5 }, () => frame(a)));
  const got = profileMetrics(solveDepth(fr, tu));
  for (const k of ['scanNoseHeight', 'scanRadix', 'scanEyeProt', 'scanChin']) assert.ok(Math.abs(got[k] - truth[k]) < 0.06, k);
});
