// 관상(얼굴 오행형) → 사주(일간·오행 분포)로 이어지는 해석
import { ELEMENTS, elementRelation } from './saju.js';

const RELATION_TEXT = {
  same: {
    title: '겉과 속이 같은 사람',
    text: (f, d) => `얼굴도 ${f}, 타고난 본성(일간)도 ${d}. 보이는 그대로의 사람이라 첫인상과 실제가 다르지 않습니다. 대신 같은 기운이 겹쳐 고집이 세질 수 있어요.`,
  },
  gen: {
    title: '얼굴이 운을 끌어오는 상',
    text: (f, d) => `얼굴의 ${f} 기운이 본성의 ${d} 기운을 살려 줍니다. 인상이 곧 무기라서 사람을 만날수록 운이 트입니다.`,
  },
  genBy: {
    title: '속이 얼굴로 드러나는 상',
    text: (f, d) => `본성의 ${d} 기운이 얼굴의 ${f} 기운으로 흘러나옵니다. 표현력이 좋아 감정과 매력이 그대로 드러나는 사람입니다.`,
  },
  ctrl: {
    title: '오해받기 쉬운 상',
    text: (f, d) => `얼굴의 ${f} 기운이 본성의 ${d} 기운을 누릅니다. 첫인상이 실제 성격보다 세거나 차갑게 보일 수 있지만, 알고 나면 반전 매력이 있습니다.`,
  },
  ctrlBy: {
    title: '알수록 다른 사람',
    text: (f, d) => `본성의 ${d} 기운이 얼굴의 ${f} 기운을 다스립니다. 겉으로는 무던해 보여도 속에 단단한 중심이 있어, 오래 볼수록 진가가 드러납니다.`,
  },
};

/**
 * @param {number} faceEl 얼굴 오행형
 * @param {ReturnType<import('./saju.js').computeSaju>} saju
 */
export function bridgeReading(faceEl, saju) {
  const rel = elementRelation(faceEl, saju.dayElement);
  const r = RELATION_TEXT[rel];
  const f = ELEMENTS[faceEl];
  const d = ELEMENTS[saju.dayElement];
  const notes = [];
  if (faceEl === saju.lacking) {
    notes.push(`사주에서 가장 부족한 기운이 ${ELEMENTS[saju.lacking]}인데, 얼굴이 바로 ${f}형입니다. 얼굴이 사주의 빈자리를 채우는 보기 드문 조합이에요.`);
  } else if ((faceEl + 1) % 5 === saju.lacking) {
    notes.push(`얼굴의 ${f} 기운이 사주에 부족한 ${ELEMENTS[saju.lacking]} 기운을 낳아 줍니다. 인상 관리가 곧 개운법입니다.`);
  }
  if (saju.excess !== null && faceEl === saju.excess) {
    notes.push(`사주에 이미 많은 ${ELEMENTS[saju.excess]} 기운이 얼굴에도 겹쳐 있어요. ${ELEMENTS[saju.lacking]} 기운(색·방향·사람)을 가까이하면 균형이 잡힙니다.`);
  }
  return { relation: rel, title: r.title, text: r.text(f, d), notes };
}
