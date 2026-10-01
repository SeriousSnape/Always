// "내가 왕이 될 상인가?" — 왕기(王氣) 지수와 조선시대 직책 판정.
// 왕기는 관상에서 귀하게 보는 요소(좌우 대칭, 삼정 균형, 곧은 콧대, 발달한 턱, 살아 있는 눈꼬리)를 합산한다.
import { z, faceElement } from './physiognomy.js';

const zz = (m, k) => (m[k] === undefined ? 0 : z(m, k));

export function kingScore(m) {
  const sym = -zz(m, 'asym');
  const thirds = (Math.abs(zz(m, 'upper')) + Math.abs(zz(m, 'middle')) + Math.abs(zz(m, 'lower'))) / 3;
  const balance = -(thirds - 0.8) / 0.6; // |z| 평균의 기댓값 ≈ 0.8
  const terms = [sym, balance, zz(m, 'noseLength'), zz(m, 'jaw') * 0.8, zz(m, 'eyeTilt') * 0.8];
  const c = terms.reduce((a, b) => a + b, 0) / Math.sqrt(terms.length);
  return Math.max(1, Math.min(99, Math.round(60 + 15 * c)));
}

// 오행형별 직책: [70~84점, 50~69점, 50점 미만]
const RANKS = [
  [
    { title: '영의정', hanja: '領議政', text: '임금 다음가는 자리. 판을 읽고 사람을 쓰는 재상의 상입니다.' },
    { title: '홍문관 선비', hanja: '弘文館', text: '붓 한 자루로 세상을 움직이는 상. 글과 기획으로 이름을 남깁니다.' },
    { title: '산속 은둔 선비', hanja: '隱士', text: '벼슬보다 자유를 택한 상. 때가 오면 누구보다 크게 쓰입니다.' },
  ],
  [
    { title: '대장군', hanja: '大將軍', text: '앞장서서 군을 이끄는 상. 기세 하나로 판을 뒤집습니다.' },
    { title: '궁중 예인', hanja: '藝人', text: '사람들의 눈과 마음을 사로잡는 상. 무대가 곧 왕좌입니다.' },
    { title: '저잣거리 광대', hanja: '廣大', text: '어디서든 웃음을 만드는 상. 백성이 가장 사랑하는 얼굴입니다.' },
  ],
  [
    { title: '조선 제일 거상', hanja: '巨商', text: '돈과 사람이 저절로 모이는 상. 나라 곳간보다 큰 곳간을 가집니다.' },
    { title: '만석꾼 지주', hanja: '地主', text: '땅처럼 든든한 상. 쌓은 것을 오래 지키는 힘이 있습니다.' },
    { title: '주막 주인', hanja: '酒幕', text: '오가는 사람이 모두 쉬어 가는 상. 정보와 인맥이 모입니다.' },
  ],
  [
    { title: '포도대장', hanja: '捕盜大將', text: '정의롭고 결단이 빠른 상. 맡은 일은 끝까지 해냅니다.' },
    { title: '무관', hanja: '武官', text: '원칙과 의리로 사는 상. 믿고 등을 맡길 수 있는 사람입니다.' },
    { title: '떠돌이 검객', hanja: '劍客', text: '어디에도 매이지 않는 상. 실력 하나로 길을 엽니다.' },
  ],
  [
    { title: '왕의 책사', hanja: '策士', text: '왕 뒤에서 판을 짜는 상. 보이지 않는 곳에서 천하를 움직입니다.' },
    { title: '역관', hanja: '譯官', text: '말과 세상을 잇는 상. 어디서든 흐름을 읽고 기회를 잡습니다.' },
    { title: '유랑 시인', hanja: '詩人', text: '바람처럼 떠도는 상. 남들이 못 보는 것을 봅니다.' },
  ],
];

const KING = { title: '왕', hanja: '王', text: '용의 얼굴, 용안(龍顔)입니다. 균형과 기세를 모두 갖춘 상으로, 사람들이 저절로 따릅니다.' };

export function kingVerdict(m) {
  const score = kingScore(m);
  const el = faceElement(m);
  const rank = score >= 85 ? KING : RANKS[el][score >= 70 ? 0 : score >= 50 ? 1 : 2];
  const answer = score >= 85 ? '예, 왕이 될 상입니다.' : score >= 70 ? '왕은 아니어도, 왕이 찾는 상입니다.' : '왕좌보다 더 자유로운 상입니다.';
  return { score, el, ...rank, answer, isKing: score >= 85 };
}
