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
  const browEye = (p[L.lidR].y - p[L.browRLow].y + (p[L.lidL].y - p[L.browLLow].y)) / 2;

  return {
    aspect: faceH / faceW,
    // 인당(미간) 너비: 눈썹 안쪽 끝 사이
    browGap: dist(p[L.browRIn], p[L.browLIn]) / eyeW,
    // 눈썹 길이: 눈 길이 대비
    browLen: browLen / eyeW,
    // 전택궁: 눈썹과 윗눈꺼풀 사이
    browEye: browEye / eyeW,
    foreheadW: dist(p[L.templeR], p[L.templeL]) / faceW,
    // 산근(콧대 뿌리) 높이: 눈 안쪽 끝보다 얼마나 앞으로 나와 있는가
    bridgeDepth: ((zOf(L.eyeRIn) + zOf(L.eyeLIn)) / 2 - zOf(L.noseBridge)) / faceW,
    // 인중 길이
    philtrum: (p[L.lipTop].y - p[L.noseBase].y) / faceH,
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
};

export const z = (m, k) => {
  const [mu, sd] = BASE[k];
  return Math.max(-2.5, Math.min(2.5, (m[k] - mu) / sd));
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

export const FACE_TYPES = [
  { name: '목형(木形)', emoji: '🌳', shape: '갸름하고 긴 얼굴', text: '곧은 나무 같은 얼굴. 학문과 기획에 강하고 성장 욕구가 큽니다. 마른 듯 단단한 인상이 신뢰를 줍니다.' },
  { name: '화형(火形)', emoji: '🔥', shape: '이마가 넓고 턱이 갸름한 얼굴', text: '불꽃처럼 위로 타오르는 얼굴. 눈빛이 살아 있고 표현력이 뛰어나 사람을 끌어당깁니다.' },
  { name: '토형(土形)', emoji: '⛰️', shape: '코와 입이 두툼한 얼굴', text: '흙처럼 두텁고 안정된 얼굴. 복이 쌓이는 상으로, 사람들이 믿고 기대는 중심이 됩니다.' },
  { name: '금형(金形)', emoji: '⚔️', shape: '턱선이 각진 얼굴', text: '쇠처럼 단단하고 반듯한 얼굴. 결단력과 추진력이 있어 리더 자리에 어울립니다.' },
  { name: '수형(水形)', emoji: '🌊', shape: '둥글고 부드러운 얼굴', text: '물처럼 둥글고 유연한 얼굴. 친화력과 지혜가 있어 어디서든 사람이 모입니다.' },
];

const pick = (v, low, mid, high, t = 0.8) => (v > t ? high : v < -t ? low : mid);

/** 부위별 해석 */
export function readFeatures(m) {
  const up = z(m, 'upper');
  const mid = z(m, 'middle');
  const low = z(m, 'lower');
  const thirds = [
    ['초년운(상정·이마)', up],
    ['중년운(중정·눈썹~코)', mid],
    ['말년운(하정·인중~턱)', low],
  ];
  const strongest = thirds.reduce((a, b) => (b[1] > a[1] ? b : a));

  return [
    {
      part: '삼정(三停)',
      text: `얼굴을 셋으로 나누면 ${strongest[0]}이 가장 발달했습니다. ` +
        (strongest === thirds[0]
          ? '일찍부터 머리가 트이고 윗사람의 도움을 받는 상입니다.'
          : strongest === thirds[1]
            ? '30~50대에 스스로 일궈 크게 일어서는 상입니다.'
            : '나이 들수록 재물과 사람이 모이는 대기만성형입니다.'),
    },
    {
      part: '눈',
      text:
        pick(z(m, 'eyeTilt'), '눈꼬리가 부드럽게 내려가 선하고 다정한 인상입니다. 사람들이 쉽게 마음을 엽니다. ', '눈꼬리가 수평에 가까워 균형 잡힌 판단력을 보여줍니다. ', '눈꼬리가 올라가 승부욕과 추진력이 강합니다. 목표가 생기면 끝까지 갑니다. ') +
        pick(z(m, 'eyeGap'), '미간이 좁은 편이라 집중력이 강하고 꼼꼼합니다.', '미간 간격이 고르게 열려 있어 마음이 넓습니다.', '미간이 넓어 여유롭고 큰 그림을 보는 사람입니다.'),
    },
    {
      part: '코(재물궁)',
      text: pick(
        z(m, 'noseWidth'),
        '콧방울이 단정해 씀씀이가 알뜰하고 재물을 지키는 힘이 있습니다.',
        '코가 균형 잡혀 버는 만큼 모이는 안정적인 재물운입니다.',
        '콧방울이 두툼해 재물을 끌어모으는 힘이 큰 상입니다.',
      ),
    },
    {
      part: '입',
      text:
        pick(z(m, 'mouthWidth'), '입이 단정하게 작아 말을 아끼고 신중합니다. ', '입 크기가 알맞아 말과 행동의 균형이 좋습니다. ', '입이 커서 사교성이 좋고 큰 무대에서 빛납니다. ') +
        pick(z(m, 'lipThickness'), '얇은 입술은 이성적이고 말에 날이 서 있습니다.', '입술 두께가 고르게 정이 많습니다.', '도톰한 입술은 정이 깊고 먹을 복이 있습니다.'),
    },
    {
      part: '턱(지각)',
      text: pick(
        z(m, 'jaw'),
        '턱이 갸름해 감수성이 풍부하고 예술적 감각이 있습니다.',
        '턱선이 균형 잡혀 끈기와 유연함을 함께 갖췄습니다.',
        '턱이 발달해 의지가 강하고 말년에 기반이 단단합니다.',
      ),
    },
  ];
}
