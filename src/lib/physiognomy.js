// 얼굴 랜드마크(MediaPipe Face Mesh 478점) → 비율 지표 → 관상 해석.
// 기준값(BASE)은 문헌·경험치 기반 추정값이며, 실제 사용자 데이터로 보정해야 한다.

const L = {
  top: 10, chin: 152, cheekR: 234, cheekL: 454,
  eyeROut: 33, eyeRIn: 133, eyeLIn: 362, eyeLOut: 263,
  browR: 105, browL: 334, noseBase: 2, noseTip: 1, noseBridge: 168,
  alarR: 129, alarL: 358, mouthR: 61, mouthL: 291, lipTop: 0, lipUpperIn: 13, lipLowerIn: 14, lipBottom: 17,
  jawR: 172, jawL: 397,
  // 눈썹 안쪽 끝·바깥 끝, 눈썹 아랫선 가운데, 윗눈꺼풀, 이마 양옆(천창 부근)
  browRIn: 55, browLIn: 285, browROut: 46, browLOut: 276, browRLow: 52, browLLow: 282,
  lidR: 159, lidL: 386, templeR: 54, templeL: 284,
  // 눈썹 바깥 끝(위·아래 선), 아래 눈꺼풀, 턱 끝 양옆, 광대, 간문(눈꼬리 옆), 누당(눈 밑), 연상·수상(콧대 중간)
  browROutUp: 70, browLOutUp: 300, lowLidR: 145, lowLidL: 374, chinR: 148, chinL: 377,
  cheekboneR: 116, cheekboneL: 345, jianmenR: 143, jianmenL: 372, tearR: 119, tearL: 348, noseMid: 195,
  glabella: 9,
};

// 눈썹 윗선·아랫선 (바깥 → 안쪽) — 형(形) 판정용
const BROW = {
  R: { up: [70, 63, 105, 66, 107], low: [46, 53, 52, 65, 55] },
  L: { up: [300, 293, 334, 296, 336], low: [276, 283, 282, 295, 285] },
};

const PAIRS = [[33, 263], [133, 362], [105, 334], [129, 358], [61, 291], [234, 454], [172, 397]];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * @param {{x:number,y:number}[]} landmarks 정규화 좌표(0~1)
 * @param {number} width 이미지 가로(px)
 * @param {number} height 이미지 세로(px)
 */
export function computeMetrics(landmarks, width, height) {
  const px = landmarks.map((p) => ({ x: p.x * width, y: p.y * height }));
  // MediaPipe의 z는 x와 같은 스케일(이미지 가로 기준). 작을수록 카메라에 가깝다
  const zOf = (i) => (landmarks[i].z ?? 0) * width;
  // 고개 기울기(roll) 보정: 두 눈 바깥점을 수평으로
  const r = px[L.eyeROut];
  const l = px[L.eyeLOut];
  const angle = Math.atan2(l.y - r.y, l.x - r.x);
  const cx = (r.x + l.x) / 2;
  const cy = (r.y + l.y) / 2;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const p = px.map(({ x, y }) => ({
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  }));

  const faceW = dist(p[L.cheekR], p[L.cheekL]);
  const faceH = p[L.chin].y - p[L.top].y;
  const browY = (p[L.browR].y + p[L.browL].y) / 2;
  const upper = browY - p[L.top].y;
  const middle = p[L.noseBase].y - browY;
  const lower = p[L.chin].y - p[L.noseBase].y;

  const eyeWR = dist(p[L.eyeROut], p[L.eyeRIn]);
  const eyeWL = dist(p[L.eyeLIn], p[L.eyeLOut]);
  const eyeW = (eyeWR + eyeWL) / 2;
  // 눈꼬리: 바깥점이 안쪽점보다 위면 양수
  const tiltR = (p[L.eyeRIn].y - p[L.eyeROut].y) / eyeWR;
  const tiltL = (p[L.eyeLIn].y - p[L.eyeLOut].y) / eyeWL;

  const mouthW = dist(p[L.mouthR], p[L.mouthL]);
  const midX = (p[L.cheekR].x + p[L.cheekL].x) / 2;
  // 좌우 대칭: 콧대~턱 중심선에서 짝이 되는 점들의 거리 차이
  const axisX = (p[L.noseBridge].x + p[L.chin].x) / 2;
  const asym =
    PAIRS.reduce((sum, [a, b]) => sum + Math.abs(Math.abs(p[a].x - axisX) - Math.abs(p[b].x - axisX)), 0) /
    PAIRS.length /
    faceW;

  const browLen = (dist(p[L.browRIn], p[L.browROut]) + dist(p[L.browLIn], p[L.browLOut])) / 2;
  const ax = (p[L.eyeRIn].x + p[L.eyeLIn].x) / 2; // 얼굴 중심선(두 눈 안쪽 끝의 가운데)
  const out = (i) => Math.abs(p[i].x - ax);
  // 눈썹 끝이 눈꼬리보다 얼마나 바깥으로 뻗었나 (眉長過目). 양수면 눈보다 길다
  const browOverR = (Math.max(out(L.browROut), out(L.browROutUp)) - out(L.eyeROut)) / eyeWR;
  const browOverL = (Math.max(out(L.browLOut), out(L.browLOutUp)) - out(L.eyeLOut)) / eyeWL;
  const browEyeR = (p[L.lidR].y - p[L.browRLow].y) / eyeWR;
  const browEyeL = (p[L.lidL].y - p[L.browLLow].y) / eyeWL;
  // 눈의 가로/세로 (細長)
  const eyeAspectR = eyeWR / Math.max(1e-6, p[L.lowLidR].y - p[L.lidR].y);
  const eyeAspectL = eyeWL / Math.max(1e-6, p[L.lowLidL].y - p[L.lidL].y);
  // 입꼬리: 입 가운데보다 위면 양수 (口角如弓 / 口垂兩角)
  const lipMidY = (p[L.lipUpperIn].y + p[L.lipLowerIn].y) / 2;
  const mouthCorner = (lipMidY - (p[L.mouthR].y + p[L.mouthL].y) / 2) / mouthW;
  // 이마 좌우 기울기 (南嶽傾側): 관자놀이 두 점의 높이 차와 중심선에서의 거리 차
  const foreheadTilt = (Math.abs(p[L.templeR].y - p[L.templeL].y) + Math.abs(out(L.templeR) - out(L.templeL))) / faceW;
  // 눈썹 높이 좌우 차: 양수면 왼쪽(본인 기준) 눈썹이 높다
  const browAsym = (p[L.browR].y - p[L.browL].y) / eyeW;
  const zAt = (i) => zOf(i);
  // 눈썹 모양: 굽음(가운데가 양끝 잇는 선보다 솟은 정도), 꼬리 올라감, 두께
  const browShape = ({ up, low }) => {
    const a = p[up[0]];
    const b = p[up[up.length - 1]];
    const len = dist(a, b);
    const lineY = (x) => a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1e-6);
    const arch = Math.max(...up.slice(1, -1).map((i) => lineY(p[i].x) - p[i].y)) / len;
    const slope = (b.y - a.y) / len; // 안쪽(b)이 바깥(a)보다 아래면 양수 = 꼬리가 올라감
    const thick = (dist(p[up[1]], p[low[1]]) + dist(p[up[2]], p[low[2]]) + dist(p[up[3]], p[low[3]])) / 3;
    return { arch, slope, thick };
  };
  const bsR = browShape(BROW.R);
  const bsL = browShape(BROW.L);
  const browEye = (p[L.lidR].y - p[L.browRLow].y + (p[L.lidL].y - p[L.browLLow].y)) / 2;

  return {
    aspect: faceH / faceW,
    // 인당(미간) 너비: 눈썹 안쪽 끝 사이
    browGap: dist(p[L.browRIn], p[L.browLIn]) / eyeW,
    browArch: (bsR.arch + bsL.arch) / 2,
    browSlope: (bsR.slope + bsL.slope) / 2,
    browThick: (bsR.thick + bsL.thick) / 2 / eyeW,
    // 눈썹 길이: 눈 길이 대비
    browLen: browLen / eyeW,
    // 전택궁: 눈썹과 윗눈꺼풀 사이
    browEye: browEye / eyeW,
    foreheadW: dist(p[L.templeR], p[L.templeL]) / faceW,
    // 산근(콧대 뿌리) 높이: 눈 안쪽 끝보다 얼마나 앞으로 나와 있는가
    bridgeDepth: ((zOf(L.eyeRIn) + zOf(L.eyeLIn)) / 2 - zOf(L.noseBridge)) / faceW,
    // 인중 길이
    philtrum: (p[L.lipTop].y - p[L.noseBase].y) / faceH,
    browOver: (browOverR + browOverL) / 2,
    browOverR,
    browOverL,
    browEyeR,
    browEyeL,
    eyeAspect: (eyeAspectR + eyeAspectL) / 2,
    eyeAspectR,
    eyeAspectL,
    eyeTiltR: tiltR,
    eyeTiltL: tiltL,
    mouthCorner,
    upperLip: (p[L.lipUpperIn].y - p[L.lipTop].y) / mouthW,
    lowerLip: (p[L.lipBottom].y - p[L.lipLowerIn].y) / mouthW,
    chinW: dist(p[L.chinR], p[L.chinL]) / faceW,
    foreheadTilt,
    browAsym,
    // 이하 깊이(z) 추정값 — 참고용(B). 양수일수록 앞으로 솟음
    cheekProm: ((zAt(L.noseBase) - zAt(L.cheekboneR)) + (zAt(L.noseBase) - zAt(L.cheekboneL))) / 2 / faceW,
    jianmenFull: ((zAt(L.eyeROut) - zAt(L.jianmenR)) + (zAt(L.eyeLOut) - zAt(L.jianmenL))) / 2 / faceW,
    tearFull: ((zAt(L.lowLidR) - zAt(L.tearR)) + (zAt(L.lowLidL) - zAt(L.tearL))) / 2 / faceW,
    noseMidHeight: ((zAt(L.eyeRIn) + zAt(L.eyeLIn)) / 2 - zAt(L.noseMid)) / faceW,
    jaw: dist(p[L.jawR], p[L.jawL]) / faceW,
    upper: upper / faceH,
    middle: middle / faceH,
    lower: lower / faceH,
    eyeGap: dist(p[L.eyeRIn], p[L.eyeLIn]) / eyeW,
    eyeTilt: (tiltR + tiltL) / 2,
    eyeSize: eyeW / faceW,
    noseWidth: dist(p[L.alarR], p[L.alarL]) / faceW,
    noseLength: (p[L.noseBase].y - p[L.noseBridge].y) / faceH,
    mouthWidth: mouthW / faceW,
    // 입을 벌려도 흔들리지 않도록 윗입술·아랫입술 두께만 더한다
    lipThickness: (p[L.lipUpperIn].y - p[L.lipTop].y + (p[L.lipBottom].y - p[L.lipLowerIn].y)) / mouthW,
    asym,
    yaw: (p[L.noseTip].x - midX) / faceW,
    roll: (angle * 180) / Math.PI,
  };
}

/** 여러 프레임 지표 평균 — 촬영할 때마다 결과가 흔들리는 문제를 줄인다 */
export function averageMetrics(list) {
  const out = {};
  for (const k of Object.keys(list[0])) out[k] = list.reduce((s, m) => s + m[k], 0) / list.length;
  return out;
}

/** 정면·무표정인지 확인 — 각도나 표정이 바뀌면 비율이 왜곡돼 결과가 흔들린다 */
export function poseIssue(m, expression) {
  if (expression && expression.smile > 0.4) return '웃으면 입과 눈 비율이 달라져요. 무표정으로 찍어 주세요.';
  if (expression && expression.jawOpen > 0.25) return '입을 다물고 찍어 주세요.';
  if (Math.abs(m.yaw) > 0.08) return '얼굴이 옆으로 돌아가 있어요. 정면을 봐 주세요.';
  if (Math.abs(m.roll) > 20) return '고개가 많이 기울어져 있어요. 똑바로 해 주세요.';
  return null;
}

// 평균: MediaPipe 표준 얼굴 모델(canonical_face_model.obj)에서 계산한 값.
// 표준편차: 추정치 — 실제 사용자 분포로 보정해야 한다.
export const BASE = {
  aspect: [1.15, 0.07],
  jaw: [0.775, 0.035],
  upper: [0.18, 0.025],
  middle: [0.41, 0.025],
  lower: [0.41, 0.03],
  eyeGap: [1.43, 0.12],
  eyeTilt: [0.03, 0.05],
  eyeSize: [0.17, 0.015],
  noseWidth: [0.235, 0.025],
  noseLength: [0.3, 0.025],
  mouthWidth: [0.32, 0.03],
  lipThickness: [0.29, 0.06],
  asym: [0.02, 0.008],
  browGap: [0.94, 0.12],
  browLen: [1.56, 0.15],
  browEye: [0.55, 0.1],
  foreheadW: [0.82, 0.04],
  bridgeDepth: [0.1, 0.03],
  philtrum: [0.075, 0.01],
  browOver: [0.49, 0.12],
  browOverR: [0.49, 0.12],
  browOverL: [0.49, 0.12],
  browEyeR: [0.55, 0.1],
  browEyeL: [0.55, 0.1],
  // 눈 가로÷세로: 표준 모델(3.87)은 눈을 반쯤 감은 형태라 실제 뜬 눈과 맞지 않는다.
  // 임시로 인체 계측 안검열(폭 28~30mm ÷ 높이 9~10mm ≈ 3.0)을 쓴다. 보정 데이터로 바꿀 것.
  eyeAspect: [3.0, 0.35],
  eyeAspectR: [3.0, 0.35],
  eyeAspectL: [3.0, 0.35],
  eyeTiltR: [0.03, 0.05],
  eyeTiltL: [0.03, 0.05],
  mouthCorner: [-0.015, 0.03],
  upperLip: [0.12, 0.03],
  lowerLip: [0.17, 0.035],
  chinW: [0.169, 0.025],
  foreheadTilt: [0.01, 0.015],
  browAsym: [0, 0.06],
  cheekProm: [-0.285, 0.04],
  jianmenFull: [-0.105, 0.02],
  tearFull: [0.006, 0.01],
  noseMidHeight: [0.197, 0.03],
  // 눈썹 모양: 평균은 표준 모델 값, 표준편차는 추정 — 보정 필요
  browArch: [0.126, 0.04],
  browSlope: [-0.172, 0.08],
  browThick: [0.242, 0.05],
  // 고개 돌리기 스캔(옆모습 깊이): 평균은 표준 모델 실제 3D 값, 표준편차는 추정 — 보정 필요
  scanNoseHeight: [0.737, 0.12],
  scanRadix: [0.398, 0.1],
  scanBridgeMid: [1.37, 0.18],
  scanHump: [0.048, 0.03],
  scanSaddle: [0, 0.03],
  scanTipDroop: [-1.06, 0.35],
  scanEyeProt: [-0.307, 0.08],
  scanChin: [-0.342, 0.1],
  scanForehead: [-0.096, 0.06],
  scanCheek: [-0.4, 0.08],
};

// 고개 돌리기 스캔으로 직접 잰 깊이가 있으면, 정면 한 장의 깊이 추정 대신 그것을 쓴다
const SCAN_ALIAS = { bridgeDepth: 'scanRadix', noseMidHeight: 'scanBridgeMid', cheekProm: 'scanCheek' };
export const z = (m, k) => {
  const a = SCAN_ALIAS[k];
  const key = a && Number.isFinite(m[a]) ? a : k;
  const [mu, sd] = BASE[key];
  return Math.max(-2.5, Math.min(2.5, (m[key] - mu) / sd));
};

/** 오행형 얼굴 점수: 목(긴 얼굴)·화(뾰족한 턱)·토(두툼)·금(각진)·수(둥근) */
export function faceElementScores(m) {
  const a = z(m, 'aspect');
  const j = z(m, 'jaw');
  const nose = z(m, 'noseWidth');
  const lip = z(m, 'lipThickness');
  const low = z(m, 'lower');
  const up = z(m, 'upper');
  return [
    a * 1.2 - j * 0.6, // 목: 길고 턱이 좁음
    -j * 1.0 + up * 0.6 + z(m, 'eyeTilt') * 0.3, // 화: 이마 쪽이 넓고 턱이 뾰족
    nose * 0.8 + lip * 0.6 + low * 0.5, // 토: 코·입이 두툼, 하관 발달
    j * 1.2 - Math.abs(a) * 0.5, // 금: 턱이 넓고 비율이 각짐
    -a * 1.2 + lip * 0.2 - Math.abs(j) * 0.2, // 수: 짧고 둥근 얼굴
  ];
}

export function faceElement(m) {
  const s = faceElementScores(m);
  let idx = 0;
  for (let i = 1; i < 5; i++) if (s[i] > s[idx]) idx = i;
  return idx;
}

// 오행형(五行形) — 사주 연결(보류, ?all 전용)에서만 쓴다. 관상 풀이에는 쓰지 않는다(docs/관상-기준.md §4).
export const FACE_TYPES = [
  { name: '목형(木形)', emoji: '🌳', shape: '갸름하고 긴 얼굴', text: '곧은 나무 같은 얼굴. 학문과 기획에 강하고 성장 욕구가 큽니다. 마른 듯 단단한 인상이 신뢰를 줍니다.' },
  { name: '화형(火形)', emoji: '🔥', shape: '이마가 넓고 턱이 갸름한 얼굴', text: '불꽃처럼 위로 타오르는 얼굴. 눈빛이 살아 있고 표현력이 뛰어나 사람을 끌어당깁니다.' },
  { name: '토형(土形)', emoji: '⛰️', shape: '코와 입이 두툼한 얼굴', text: '흙처럼 두텁고 안정된 얼굴. 복이 쌓이는 상으로, 사람들이 믿고 기대는 중심이 됩니다.' },
  { name: '금형(金形)', emoji: '⚔️', shape: '턱선이 각진 얼굴', text: '쇠처럼 단단하고 반듯한 얼굴. 결단력과 추진력이 있어 리더 자리에 어울립니다.' },
  { name: '수형(水形)', emoji: '🌊', shape: '둥글고 부드러운 얼굴', text: '물처럼 둥글고 유연한 얼굴. 친화력과 지혜가 있어 어디서든 사람이 모입니다.' },
];
