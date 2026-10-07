// 고개 돌리기 스캔 — 여러 각도의 얼굴 점으로 깊이(앞뒤 높이)를 직접 계산한다.
// 원리: 고개를 θ만큼 돌리면 화면 가로 위치 x = s·(X·cosθ + D·sinθ) + t (X: 정면 가로, D: 깊이).
// 세로 y = s·Y + t' 로 크기 s 를 먼저 구하고, 각 장면의 θ 를 찾은 뒤, 모든 장면을 모아 점마다 D 를 푼다.
// 정면 한 장의 깊이(MediaPipe 추정)는 시작값으로만 쓴다. 사진·좌표는 기기 밖으로 나가지 않는다.

const N = 468; // 얼굴 점(눈동자 점은 시선 따라 움직여서 뺀다)

const P = {
  eyeInR: 133, eyeInL: 362, eyeOutR: 33, eyeOutL: 263,
  radix: 168, bridge: [168, 6, 197, 195, 5, 4], tip: 4, sub: 2, alarR: 129, alarL: 358,
  cheekR: 116, cheekL: 345, lidR: 159, lidL: 386, browR: 66, browL: 296,
  forehead: 151, glabella: 9, chin: 152, lipLow: 17,
};

/** 한 장면의 점들을 정면 기준 크기로 맞춘 좌표로 */
function frameXY(lm, w, h, unit, cx, cy) {
  const xs = new Float64Array(N);
  const ys = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    xs[i] = (lm[i].x * w - cx) / unit;
    ys[i] = (lm[i].y * h - cy) / unit;
  }
  return { xs, ys };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

/**
 * @param {{landmarks:{x,y,z}[], w:number, h:number}[]} frontal 정면 장면들(고개 거의 안 돌림)
 * @param {{landmarks:{x,y,z}[], w:number, h:number}[]} turned  돌린 장면들
 * @returns {{X:Float64Array, Y:Float64Array, D:Float64Array, angles:number[], residual:number}|null}
 */
export function solveDepth(frontal, turned, iterations = 8) {
  if (!frontal.length || turned.length < 4) return null;
  const f0 = frontal[0];
  const px = (lm, i) => ({ x: lm[i].x * f0.w, y: lm[i].y * f0.h });
  const unit = Math.hypot(px(f0.landmarks, P.eyeInR).x - px(f0.landmarks, P.eyeInL).x, px(f0.landmarks, P.eyeInR).y - px(f0.landmarks, P.eyeInL).y);
  const cx = mean(Array.from({ length: N }, (_, i) => f0.landmarks[i].x * f0.w));
  const cy = mean(Array.from({ length: N }, (_, i) => f0.landmarks[i].y * f0.h));

  // 정면 좌표(여러 장 평균)와 깊이 시작값(MediaPipe z: 카메라 쪽이 음수 → D = -z)
  const X = new Float64Array(N);
  const Y = new Float64Array(N);
  const D = new Float64Array(N);
  for (const f of frontal) {
    const { xs, ys } = frameXY(f.landmarks, f.w, f.h, unit, cx, cy);
    for (let i = 0; i < N; i++) {
      X[i] += xs[i] / frontal.length;
      Y[i] += ys[i] / frontal.length;
      D[i] += (-f.landmarks[i].z * f.w) / unit / frontal.length;
    }
  }
  const mx = mean(X);
  const my = mean(Y);
  for (let i = 0; i < N; i++) {
    X[i] -= mx;
    Y[i] -= my;
  }
  const md = mean(D);
  for (let i = 0; i < N; i++) D[i] -= md;

  const frames = turned.map((f) => frameXY(f.landmarks, f.w, f.h, unit, cx, cy));
  // 크기 s, 세로 이동은 y 로 (고개를 좌우로만 돌린다고 본다)
  const fit = frames.map(({ xs, ys }) => {
    const ym = mean(ys);
    let num = 0;
    let den = 0;
    for (let i = 0; i < N; i++) {
      num += Y[i] * (ys[i] - ym);
      den += Y[i] * Y[i];
    }
    return { s: num / den, theta: 0, t: 0 };
  });

  let residual = 0;
  for (let it = 0; it < iterations; it++) {
    // 1) 장면마다 θ, 가로 이동 t 찾기 (깊이 D 고정)
    residual = 0;
    frames.forEach(({ xs }, k) => {
      const { s } = fit[k];
      let best = { err: Infinity, theta: 0, t: 0 };
      for (let deg = -70; deg <= 70; deg += 0.5) {
        const th = (deg * Math.PI) / 180;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        let tsum = 0;
        for (let i = 0; i < N; i++) tsum += xs[i] - s * (c * X[i] + sn * D[i]);
        const t = tsum / N;
        let err = 0;
        for (let i = 0; i < N; i += 3) err += (xs[i] - s * (c * X[i] + sn * D[i]) - t) ** 2;
        if (err < best.err) best = { err, theta: th, t };
      }
      fit[k].theta = best.theta;
      fit[k].t = best.t;
      residual += best.err;
    });
    // 2) 점마다 깊이 D 풀기 (θ 고정) — 많이 돌린 장면일수록 무게가 크다
    for (let i = 0; i < N; i++) {
      let num = 0;
      let den = 0;
      frames.forEach(({ xs }, k) => {
        const { s, theta, t } = fit[k];
        const b = s * Math.sin(theta);
        num += b * (xs[i] - t - s * Math.cos(theta) * X[i]);
        den += b * b;
      });
      if (den > 1e-6) D[i] = num / den;
    }
    const m2 = mean(D);
    for (let i = 0; i < N; i++) D[i] -= m2;
  }
  return { X, Y, D, angles: fit.map((f) => (f.theta * 180) / Math.PI), residual: residual / frames.length };
}

/** 깊이에서 옆모습 지표 (모두 두 눈 안쪽 끝 사이 거리 = 1 기준, 클수록 앞으로 나옴) */
export function profileMetrics({ X, Y, D }) {
  const d = (i) => D[i];
  const avg = (...is) => is.reduce((s, i) => s + D[i], 0) / is.length;
  // 콧대 곧음: 산근→코끝 직선에서 가운데 점들이 앞으로 튀어나온 최대치(+) / 꺼진 최대치(-)
  const [a, ...rest] = P.bridge;
  const b = P.bridge.at(-1);
  const line = (i) => {
    const r = (Y[i] - Y[a]) / (Y[b] - Y[a] || 1e-6);
    return D[a] + r * (D[b] - D[a]);
  };
  const devs = rest.slice(0, -1).map((i) => D[i] - line(i));
  const hump = Math.max(0, ...devs);
  const saddle = Math.min(0, ...devs);
  // 코끝 처짐: 코끝(4)이 코밑(2)보다 아래로 내려온 정도 대비 앞으로 나온 정도
  const tipDroop = (Y[P.tip] - Y[P.sub]) / Math.max(0.05, D[P.tip] - D[P.sub]);
  return {
    scanNoseHeight: d(P.tip) - avg(P.alarR, P.alarL),
    scanRadix: d(P.radix) - avg(P.eyeInR, P.eyeInL),
    scanBridgeMid: d(195) - avg(P.cheekR, P.cheekL),
    scanHump: hump,
    scanSaddle: saddle,
    scanTipDroop: tipDroop,
    scanEyeProt: avg(P.lidR, P.lidL) - avg(P.browR, P.browL),
    scanChin: d(P.chin) - d(P.lipLow),
    scanForehead: d(P.forehead) - d(P.glabella),
    scanCheek: avg(P.cheekR, P.cheekL) - avg(P.eyeOutR, P.eyeOutL),
  };
}

/** 스캔 진행: 정면 → 왼쪽 → 오른쪽. 각 단계에 필요한 고개 각도(대략, 얼굴 점으로 추정) */
export const SCAN_STEPS = [
  { key: 'front', say: '정면을 보고 잠깐 멈춰요', need: (yaw) => Math.abs(yaw) < 0.04, frames: 6 },
  { key: 'left', say: '천천히 고개를 왼쪽으로 돌려요', need: (yaw, dir) => dir * yaw > 0.12, frames: 6 },
  { key: 'right', say: '이번엔 천천히 오른쪽으로', need: (yaw, dir) => dir * yaw < -0.12, frames: 6 },
];

/** 정면 한 장 기준 대략의 좌우 돌림(코끝이 두 볼 가운데서 벗어난 정도) */
export function quickYaw(lm) {
  const nose = lm[1].x;
  const l = lm[234].x;
  const r = lm[454].x;
  return (nose - (l + r) / 2) / Math.abs(r - l);
}
