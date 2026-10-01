// 오행형 얼굴끼리의 상생·상극으로 보는 '가까이하면 좋은 상'과 '부딪히기 쉬운 상'.
// 특정 인물을 나쁘게 단정하지 않도록, 상대의 얼굴형 '유형'과 나의 관계로만 말한다.
import { FACE_TYPES } from './physiognomy.js';

const name = (el) => FACE_TYPES[el].name.replace(/\(.*\)/, '');
const shape = (el) => FACE_TYPES[el].shape;

/** @param {number} me 나의 얼굴 오행형 */
export function faceAffinity(me) {
  const genMe = (me + 4) % 5; // 나를 생하는 형
  const iGen = (me + 1) % 5; // 내가 생하는 형
  const iCtrl = (me + 2) % 5; // 내가 극하는 형
  const ctrlMe = (me + 3) % 5; // 나를 극하는 형
  return {
    close: [
      {
        el: genMe,
        role: '연인·배우자',
        title: `${name(genMe)} — 나를 북돋아 주는 얼굴`,
        text: `${shape(genMe)}. 이 얼굴의 기운이 나를 살려 주는 상생 관계라, 곁에 있으면 마음이 편해지고 운이 트입니다.`,
      },
      {
        el: me,
        role: '친구',
        title: `${name(me)} — 말 안 해도 통하는 얼굴`,
        text: `나와 같은 ${shape(me)}. 생각의 결이 같아 친구로는 최고지만, 연인이 되면 닮은 만큼 고집이 부딪힐 수 있어요.`,
      },
      {
        el: iGen,
        role: '후배·동료',
        title: `${name(iGen)} — 내가 챙기고 싶은 얼굴`,
        text: `${shape(iGen)}. 내 기운이 상대를 키워 주는 관계라 함께 일하면 서로 득이 됩니다. 다만 나만 주다 지치지 않게 균형을 잡으세요.`,
      },
    ],
    caution: [
      {
        el: ctrlMe,
        title: `${name(ctrlMe)} — 처음엔 기가 눌리는 얼굴`,
        text: `${shape(ctrlMe)}. 상대의 기운이 나를 누르는 상극 관계라 위축되기 쉽습니다. 피하기보다 내 속도를 지키며 만나면 오히려 나를 단련시켜 줍니다.`,
      },
      {
        el: iCtrl,
        title: `${name(iCtrl)} — 내가 무심코 상처 주기 쉬운 얼굴`,
        text: `${shape(iCtrl)}. 내 기운이 상대를 누르는 관계라, 같은 말도 세게 들립니다. 말투를 한 번 더 고르면 오래 갑니다.`,
      },
    ],
  };
}
