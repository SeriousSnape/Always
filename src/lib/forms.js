// 오관의 형(形) — 『麻衣相法』 권2 그림 표(눈썹 p70~75, 눈 p80~89, 코 p92~97, 입 p102~105, 귀 p112~115).
// 결정(2026-10-07): 오관 모두 '닮은 형'을 고르고, 가장 좋은 관을 대표로 내세운다.
// 후보는 원전 표시가 길한 형만(흉한 형은 후보에 넣지 않는다). 풀이는 가장 긍정적으로.
// 형 고르기는 원전 그림·시에 나온 '모양'만 쓴다(빛깔·털결·눈빛·소리는 재지 않음).
// 기준서: docs/오관-형-기준.md
import { z } from './physiognomy.js';
import { EYE_TYPES, eyeShape } from './eyes.js';

const clip = (v) => Math.max(-2, Math.min(2, v));
const zs = (m, keys) => keys.map((k) => clip(m[k] === undefined ? 0 : z(m, k)));

// p: 원형 [특징 z 값…], scan: 고개 돌리기 스캔(옆모습)이 있어야 제대로 가리는 형
export const ORGANS = {
  brow: {
    name: '눈썹', officer: '보수관(保壽官)', axes: ['길이', '굽음', '꼬리 올라감', '두께'],
    shape: (m) => zs(m, ['browLen', 'browArch', 'browSlope', 'browThick']),
    types: [
      { key: 'ilja', hanja: '一字眉', name: '일자 눈썹', tag: '富貴', page: 'p74', p: [1, -1.2, 0, 0.5],
        shapeKo: '털이 맑고 머리부터 꼬리까지 한결같은 곧은 눈썹', says: '毫清首尾皆如一 富貴堪誇壽且高',
        reading: '처음과 끝이 한결같은 눈썹이에요. 원전은 "부귀를 자랑할 만하고 수명도 길며, 젊어서 일찍 이름을 올린다"고 해요.' },
      { key: 'sinwol', hanja: '新月眉', name: '초승달 눈썹', tag: '大貴', page: 'p75', p: [0.5, 1.6, 0, -0.3],
        shapeKo: '맑고 빼어나게 휘어진 초승달 같은 눈썹', says: '眉清目秀最爲良',
        reading: '맑게 휘어진 초승달 눈썹이에요. 원전은 이 눈썹을 "가장 좋다(最爲良)"고 하고, 형제가 모두 귀하게 되며 조정에 나아간다고 해요.' },
      { key: 'wajam', hanja: '臥蠶眉', name: '누운 누에 눈썹', tag: '貴', page: 'p74', p: [0, 1, 0, 0.8],
        shapeKo: '누에가 누운 듯 굽고 빼어난 눈썹', says: '眉彎帶秀心中巧',
        reading: '누에가 누운 듯 굽은 눈썹이에요. 원전은 "마음이 정교하다(心中巧)"고 해요. 손끝이 야무지고 머리가 잘 돌아가는 사람이에요.' },
      { key: 'geom', hanja: '劍眉', name: '칼 눈썹', tag: '主威權', page: 'p73', p: [1, -0.5, 1.6, 0.5],
        shapeKo: '칼처럼 곧게 뻗어 꼬리가 올라간 눈썹', says: '威權智識輔君王',
        reading: '칼처럼 곧게 뻗은 눈썹이에요. 원전은 "위엄과 권세, 지혜와 식견으로 임금을 돕는다"고 해요. 결단력 있는 리더의 눈썹이에요.' },
      { key: 'long', hanja: '龍眉', name: '용의 눈썹', tag: '大貴', page: 'p72', p: [1.3, 0.8, 0.5, 1.3],
        shapeKo: '길고 짙으며 힘차게 휘어진 눈썹', says: '父母清壽皆齊貴',
        reading: '길고 힘찬 용의 눈썹이에요. 원전은 "부모가 맑고 오래 살며 모두 귀하고, 빼어나기가 천하에 드물다"고 해요.' },
      { key: 'yuyeop', hanja: '柳葉眉', name: '버들잎 눈썹', tag: '發達', page: 'p72', p: [0.5, 0.5, -0.3, -1],
        shapeKo: '버들잎처럼 가늘고 부드럽게 휜 눈썹', says: '友交忠信貴人欽',
        reading: '버들잎처럼 가는 눈썹이에요. 원전은 "벗을 사귐에 충성되고 미더워 귀인이 공경하고, 반드시 이름을 드날린다"고 해요.' },
      { key: 'saja', hanja: '獅子眉', name: '사자 눈썹', tag: '富貴', page: 'p73', p: [0, 1.3, 0.3, 1.7],
        shapeKo: '굵고 높게 솟은 사자 같은 눈썹', says: '富貴榮華老更輝',
        reading: '굵고 높게 솟은 사자 눈썹이에요. 원전은 "부귀영화가 늙을수록 더 빛난다"고 해요. 늦게 피어 오래 가는 눈썹이에요.' },
      { key: 'gyeongcheong', hanja: '輕清眉', name: '맑고 가벼운 눈썹', tag: '早貴', page: 'p73', p: [0, 0, 0, -1.6],
        shapeKo: '가볍고 맑은 눈썹', says: '早貴',
        reading: '가볍고 맑은 눈썹이에요. 원전은 "일찍 귀해진다(早貴)"고 해요. 젊어서 먼저 빛을 보는 사람이에요.' },
      { key: 'susu', hanja: '短促秀眉', name: '짧고 빼어난 눈썹', tag: '清貴', page: 'p74', p: [-1.6, 0, 0, 0],
        shapeKo: '짧지만 빼어난 눈썹', says: '秀短之眉壽且高',
        reading: '짧지만 빼어난 눈썹이에요. 원전은 "수명이 길고 높으며, 평생 어긋남이 없고 충효와 어짊을 지킨다"고 해요.' },
      { key: 'ho', hanja: '虎眉', name: '범의 눈썹', tag: '福壽', page: 'p75', p: [0.3, 0, 0.3, 1.5],
        shapeKo: '굵고 위엄 있는 눈썹', says: '此眉須粗且有威',
        reading: '굵고 위엄 있는 범의 눈썹이에요. 원전은 "평생 담이 크고, 끝내 크게 귀해지며 오래 산다"고 해요.' },
    ],
  },
  eye: {
    name: '눈', officer: '감찰관(監察官)', axes: ['길이', '크기', '눈꼬리'],
    shape: eyeShape,
    types: EYE_TYPES.map((t) => ({ ...t, page: t.page.replace('麻衣 ', ''), says: t.verse, img: `eyes/${t.key}.jpg` })),
  },
  nose: {
    name: '코', officer: '심변관(審辨官)', axes: ['콧방울 너비', '길이', '콧대 높이'],
    shape: (m) => zs(m, ['noseWidth', 'noseLength', 'noseMidHeight']),
    types: [
      { key: 'yong', hanja: '龍鼻', name: '용의 코', tag: '大貴', page: 'p92', p: [0.3, 1.2, 1.3], scan: true,
        shapeKo: '풍성히 솟고 산근이 곧게 이어진 코', says: '龍鼻豐隆準上齊 山根直聳',
        reading: '풍성하게 솟아 곧게 뻗은 코예요. 원전은 "높은 자리에 올라 구정(九鼎)에 앉는다"고 해요.' },
      { key: 'ho', hanja: '虎鼻', name: '범의 코', tag: '大富', page: 'p92', p: [1.3, 0, 0.6],
        shapeKo: '둥글고 우람하며 콧구멍이 드러나지 않는 코', says: '虎鼻圓壯不露孔',
        reading: '둥글고 우람한 범의 코예요. 원전은 "크게 부유하고 귀하며 이름이 세상에 드물다"고 해요.' },
      { key: 'saja', hanja: '獅鼻', name: '사자의 코', tag: '富貴', page: 'p93', p: [1.6, 0, -0.8],
        shapeKo: '콧대는 낮고 평평하되 코끝이 풍성한 코', says: '準上豐大',
        reading: '코끝이 크고 풍성한 사자의 코예요. 원전은 "사자의 형을 갖추면 참으로 부유하고 귀하다"고 해요.' },
      { key: 'hyeondam', hanja: '懸膽鼻', name: '쓸개를 매단 코', tag: '富貴', page: 'p93', p: [0.4, 1, 0.6], scan: true,
        shapeKo: '쓸개를 매단 듯 코끝이 둥글게 맺힌 코', says: '鼻如懸膽準頭齊',
        reading: '쓸개를 매단 듯 코끝이 둥근 코예요. 관상에서 가장 이름난 좋은 코로, 원전은 "부귀영화가 한창때 찾아온다"고 해요.' },
      { key: 'bokseo', hanja: '伏犀鼻', name: '엎드린 무소의 코', tag: '大貴', page: 'p93', p: [0, 1.2, 1.8], scan: true,
        shapeKo: '콧대가 이마까지 솟아 이어진 코', says: '伏犀鼻插天庭中',
        reading: '콧대가 이마까지 곧게 이어진 코예요. 원전은 "지위가 삼공(三公)에 이른다"고 해요.' },
      { key: 'u', hanja: '牛鼻', name: '소의 코', tag: '大富', page: 'p93', p: [1.2, 0.5, 0.3],
        shapeKo: '크고 가지런하며 뿌리가 굵은 코', says: '牛鼻豐齊根且大',
        reading: '크고 가지런한 소의 코예요. 원전은 "금을 쌓아 집안의 도를 이룬다"고 해요.' },
      { key: 'jeoltong', hanja: '截筒鼻', name: '대통을 자른 코', tag: '富貴', page: 'p94', p: [-0.3, 1, 0.6], scan: true,
        shapeKo: '대통을 자른 듯 곧고 끝이 가지런한 코', says: '準頭齊直不偏斜',
        reading: '대통을 자른 듯 곧은 코예요. 원전은 "공명과 부귀를 누리고 중년에 크게 집안을 이룬다"고 해요.' },
      { key: 'seongnang', hanja: '盛囊鼻', name: '주머니를 채운 코', tag: '富貴', page: 'p94', p: [1, 0, 0],
        shapeKo: '주머니를 채운 듯 둥글고 넉넉한 코', says: '鼻如盛囊',
        reading: '주머니를 가득 채운 듯 넉넉한 코예요. 원전은 "처음부터 끝까지 재물을 갖추고, 공명이 반드시 붉은 옷(높은 벼슬)에 이른다"고 해요.' },
    ],
  },
  mouth: {
    name: '입', officer: '출납관(出納官)', axes: ['너비', '입술 두께', '입꼬리 올라감'],
    shape: (m) => zs(m, ['mouthWidth', 'lipThickness', 'mouthCorner']),
    types: [
      { key: 'saja', hanja: '四字口', name: '넉 사(四) 자 입', tag: '富貴', page: 'p102', p: [0.8, 0.8, 0],
        shapeKo: '네모반듯한 四 자 같은 입', says: '聰明更又多才學',
        reading: '네모반듯한 넉 사 자 입이에요. 원전은 "총명하고 재주가 많아 배움이 넉넉하고 부귀하다"고 해요.' },
      { key: 'bang', hanja: '方口', name: '모난 입', tag: '主貴', page: 'p102', p: [0, 0.5, 0],
        shapeKo: '반듯하고 입술이 가지런해 이가 드러나지 않는 입', says: '方口齊唇不露牙',
        reading: '반듯하고 가지런한 입이에요. 원전은 "부귀와 영화를 누린다"고 해요. 말이 바르고 믿음직한 사람이에요.' },
      { key: 'angwol', hanja: '仰月口', name: '위로 휜 달 입', tag: '富貴', page: 'p102', p: [0, 0, 1.7],
        shapeKo: '달이 위를 보듯 입꼬리가 올라간 입', says: '口如仰月上朝',
        reading: '입꼬리가 달처럼 올라간 입이에요. 원전은 "글재주가 뱃속에 가득해 이름값이 높고, 마침내 부귀하여 조정에 선다"고 해요.' },
      { key: 'mangung', hanja: '彎弓口', name: '당긴 활 입', tag: '富貴', page: 'p103', p: [0.5, 1, 1],
        shapeKo: '활을 당긴 듯 휘고 두 입술이 도톰한 입', says: '口似彎弓 兩唇豐厚',
        reading: '활시위를 당긴 듯 휜 입이에요. 원전은 "부귀를 누리고 중년에 복이 저절로 온다"고 해요.' },
      { key: 'u', hanja: '牛口', name: '소의 입', tag: '富貴', page: 'p103', p: [0.5, 1.6, 0],
        shapeKo: '두 입술이 두텁고 풍성한 입', says: '牛口雙唇厚且豐',
        reading: '두 입술이 두툼한 소의 입이에요. 원전은 "평생 의식과 녹봉이 더욱 번창한다"고 해요.' },
      { key: 'yong', hanja: '龍口', name: '용의 입', tag: '主貴', page: 'p103', p: [1, 0.8, 0.5],
        shapeKo: '두 입술이 풍성하고 가지런하며 입꼬리가 또렷한 입', says: '龍口兩唇豐且齊',
        reading: '풍성하고 가지런한 용의 입이에요. 원전은 "부르면 모이고 꾸짖으면 흩어져 권세가 통한다"고 해요. 말 한마디로 사람을 움직이는 입이에요.' },
      { key: 'ho', hanja: '虎口', name: '범의 입', tag: '主富', page: 'p103', p: [1.8, 0.5, 0],
        shapeKo: '넓고 커서 주먹이 들어갈 만한 입', says: '虎口闊大有收拾',
        reading: '넓고 큰 범의 입이에요. 원전은 "부를 쌓아 옥과 금이 쌓이니 즐거움이 저절로 온다"고 해요.' },
      { key: 'aengdo', hanja: '櫻桃口', name: '앵두 입', tag: '富貴', page: 'p105', p: [-1.5, 0.5, 0.3],
        shapeKo: '작고 도톰한 앵두 같은 입', says: '聰明拔萃',
        reading: '작고 도톰한 앵두 입이에요. 원전은 "총명하고 빼어나 높은 벼슬의 옷을 입는다"고 해요. 웃는 모습이 연꽃을 머금은 듯 다정한 입이에요.' },
    ],
  },
  ear: {
    name: '귀', officer: '채청관(採聽官)', axes: [],
    shape: null, // 정면 얼굴 모델에 귀가 없다 — 고개 돌리기 스캔 + 귀 인식 모델이 필요
    types: [
      { key: 'geum', hanja: '金耳', name: '쇠 귀', tag: '富貴', page: 'p112', shapeKo: '눈썹보다 높고 희며 귓불이 구슬처럼 드리운 귀', says: '耳白過面並垂珠',
        reading: '희고 높이 솟은 귀예요. 원전은 "부귀하고 조정에 이름을 날린다"고 해요.' },
      { key: 'su', hanja: '水耳', name: '물 귀', tag: '富貴', page: 'p112', shapeKo: '두텁고 둥글며 눈썹보다 높고 귓불이 드리운 귀', says: '水耳厚圓高過眉',
        reading: '두텁고 둥근 귀예요. 원전은 "부귀를 세워 조정의 대장부가 된다"고 해요.' },
    ],
  },
};

const ORDER = ['eye', 'brow', 'nose', 'mouth', 'ear'];
// 대표 관 고르기: 그 관에 딸린 판정 중 길한 것의 수 → 같으면 達磨 비중(눈 5, 나머지 2)
const ORGAN_JUDGE = {
  eye: ['gamchal', 'jeontaek'],
  brow: ['bosu', 'hyungje'],
  nose: ['simbyeon', 'jaebaek', 'jungak'],
  mouth: ['chulnap'],
  ear: ['chaecheong'],
};
const WEIGHT = { eye: 5, brow: 2, nose: 2, mouth: 2, ear: 2 };

/** 한 관의 닮은 형 */
export function formOf(organ, m) {
  const o = ORGANS[organ];
  if (!o.shape) return null;
  const s = o.shape(m);
  const ranked = o.types
    .map((t) => ({ ...t, organ, d: Math.hypot(...t.p.map((v, i) => s[i] - v)) }))
    .sort((a, b) => a.d - b.d);
  return { organ, name: o.name, officer: o.officer, best: ranked[0], second: ranked[1], shape: s, axes: o.axes };
}

/** 오관 전체 + 대표 관 */
export function formsOf(m, results) {
  const all = ORDER.map((k) => formOf(k, m)).filter(Boolean);
  const score = (k) => (ORGAN_JUDGE[k] ?? []).filter((j) => results?.[j]?.grade === 'good').length * 10 + WEIGHT[k];
  const lead = [...all].sort((a, b) => score(b.organ) - score(a.organ))[0];
  return { lead, all, pending: ORDER.filter((k) => !ORGANS[k].shape) };
}

export const imgOf = (f) => f.img ?? `forms/${f.organ}-${f.key}.jpg`;
