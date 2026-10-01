// 이마 노출 판별과 머리선(髮際) 찾기.
// 麻衣 p49: "髮際至印堂 上停" — 상정은 머리선부터 재야 하므로, 앞머리가 이마를 가리면 상정을 판정하지 않는다.

const IDX = { browR: 105, browL: 334, eyeROut: 33, eyeLOut: 263, top: 10, noseBase: 2, chin: 152, cheekR: 234, cheekL: 454 };

/**
 * @param {Uint8Array} mask 머리카락 분할 결과 (가로×세로, 머리카락이면 hairValue)
 * @param {number} width
 * @param {number} height
 * @param {{x:number,y:number}[]} landmarks 정규화 좌표(0~1)
 * @param {number} [hairValue]
 * @returns {{status:'visible'|'covered'|'unclear', reason:string, thirds:{upper:number,middle:number,lower:number}|null}}
 */
export function analyzeForehead(mask, width, height, landmarks, hairValue = 1) {
  const P = (i) => ({ x: landmarks[i].x * width, y: landmarks[i].y * height });
  const r = P(IDX.eyeROut);
  const l = P(IDX.eyeLOut);
  const len = Math.hypot(l.x - r.x, l.y - r.y);
  const e = { x: (l.x - r.x) / len, y: (l.y - r.y) / len }; // 눈을 잇는 방향
  const u = { x: e.y, y: -e.x }; // 얼굴 위쪽 방향
  const bR = P(IDX.browR);
  const bL = P(IDX.browL);
  const brow = { x: (bR.x + bL.x) / 2, y: (bR.y + bL.y) / 2 };
  const proj = (p) => (p.x - brow.x) * u.x + (p.y - brow.y) * u.y; // 눈썹선 기준 위쪽 거리
  const faceW = Math.hypot(P(IDX.cheekL).x - P(IDX.cheekR).x, P(IDX.cheekL).y - P(IDX.cheekR).y);
  const meshTop = proj(P(IDX.top)); // 얼굴 메시 맨 윗점까지의 거리
  const middle = -proj(P(IDX.noseBase));
  const lower = proj(P(IDX.noseBase)) - proj(P(IDX.chin));

  const isHair = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
    return mask[yi * width + xi] === hairValue;
  };

  // 이마 가운데와 양옆, 5개 세로줄을 눈썹선에서 위로 훑는다
  const cols = [-0.24, -0.12, 0, 0.12, 0.24].map((k) => {
    const sx = brow.x + e.x * k * faceW;
    const sy = brow.y + e.y * k * faceW;
    let run = 0;
    for (let t = 2; t < meshTop * 2.2; t++) {
      const h = isHair(sx + u.x * t, sy + u.y * t);
      if (h === null) return { cut: true, t };
      run = h ? run + 1 : 0;
      if (run >= 3) return { hair: t - 2 };
    }
    return { none: true };
  });

  const covered = cols.filter((c) => c.hair !== undefined && c.hair < meshTop * 0.85).length;
  if (covered >= 2) {
    return { status: 'covered', reason: '앞머리가 이마를 가리고 있어요', thirds: null };
  }
  const cut = cols.filter((c) => c.cut && c.t < meshTop * 1.05).length;
  if (cut >= 2) {
    return { status: 'unclear', reason: '사진에서 이마 윗부분이 잘렸어요', thirds: null };
  }
  const found = cols.filter((c) => c.hair !== undefined).map((c) => c.hair).sort((a, b) => a - b);
  if (found.length < 3) {
    return { status: 'unclear', reason: '머리선을 찾지 못했어요 (모자·민머리·배경 등)', thirds: null };
  }
  const upper = found[Math.floor(found.length / 2)];
  const sum = upper + middle + lower;
  return {
    status: 'visible',
    reason: '이마가 드러나 머리선을 찾았어요',
    thirds: { upper: upper / sum, middle: middle / sum, lower: lower / sum },
  };
}
