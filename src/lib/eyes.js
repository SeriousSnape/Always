// 동물형 눈 — 『麻衣相法』 권2 相目 그림(p80~89) 가운데 길한 뜻만 있는 눈 7가지.
// 결정(2026-10-06): 첫 화면의 '닮은 눈'으로 쓰고, 가장 긍정적으로 그리고 풀이한다.
// 원전의 시는 눈빛(神)·흑백·성품까지 말하지만, 여기서는 사진으로 잴 수 있는
// 모양(길이·크기·눈꼬리)만으로 가장 가까운 눈을 고른다. 흉한 뜻의 눈(羊·蛇·猪 등)과
// 뜻이 섞인 눈(猴 多慮, 陰陽 多詐, 鴛鴦 淫, 虎 子有傷)은 후보에서 뺐다.
import { z } from './physiognomy.js';

// p: 판정에 쓰는 모양 [길이(가로÷세로), 크기, 눈꼬리 올라감] 의 z 값 원형
export const EYE_TYPES = [
  {
    key: 'long', hanja: '龍眼', name: '용의 눈', tag: '大貴', page: '麻衣 p80', p: [1, 1, 0],
    shape: '波長眼大', shapeKo: '길게 뻗고 큰 눈',
    verse: '如此富貴非小可 竟能受祿輔明皇',
    verseKo: '이런 부귀는 작지 않으니, 마침내 녹을 받아 밝은 임금을 돕는다.',
    reading: '크게 뜨고 멀리 보는 눈이에요. 판을 크게 읽고, 큰 사람 곁에서 큰일을 맡는 눈이에요.',
  },
  {
    key: 'bong', hanja: '鳳眼', name: '봉황의 눈', tag: '富貴', page: '麻衣 p80', p: [1, 0, 1.2],
    shape: '波長', shapeKo: '길고 눈꼬리가 위로 날아오르는 눈',
    verse: '聰明智慧功名遂 拔萃超羣壓眾英',
    verseKo: '총명하고 지혜로워 공명을 이루고, 무리에서 빼어나 뭇 영재를 누른다.',
    reading: '눈꼬리가 날개처럼 올라간 눈이에요. 머리가 빠르고, 여럿 가운데서 단연 눈에 띄는 사람이에요.',
  },
  {
    key: 'seobong', hanja: '瑞鳳眼', name: '상서로운 봉황의 눈', tag: '主貴', page: '麻衣 p83', p: [1, 0, 0],
    shape: '兩角齊 二波長秀', shapeKo: '두 눈꼬리가 가지런하고 길게 빼어난 눈',
    verse: '翰苑聲名達鳳池',
    verseKo: '글 짓는 자리에서 이름을 떨쳐 봉황의 연못(조정)에 이른다.',
    reading: '부드럽게 웃는 듯 가지런한 눈이에요. 원전은 이 눈을 "어울리되 휩쓸리지 않는다(和而不流)"고 해요. 말과 글로 이름을 얻는 눈이에요.',
  },
  {
    key: 'sang', hanja: '象眼', name: '코끼리의 눈', tag: '福壽', page: '麻衣 p81', p: [1.5, -1, 0],
    shape: '波長眼細', shapeKo: '가늘고 길게 뻗은 눈',
    verse: '及時富貴皆爲妙 遐算清平樂且歌',
    verseKo: '때맞춰 오는 부귀가 모두 묘하고, 긴 수명이 맑고 평안해 즐겁게 노래한다.',
    reading: '가늘고 길어 순하고 어진 눈이에요. 원전은 "어질고 온화하다(仁和)"고 해요. 복이 때맞춰 오고 오래 누리는 눈이에요.',
  },
  {
    key: 'u', hanja: '牛眼', name: '소의 눈', tag: '巨富', page: '麻衣 p82', p: [-1, 1.2, 0],
    shape: '眼大睛圓', shapeKo: '크고 둥근 눈',
    verse: '興財巨萬無差跌 壽算綿長福祿終',
    verseKo: '재물을 일으켜 거만(巨萬)에 이르러도 어긋남이 없고, 수명이 길어 복록으로 마친다.',
    reading: '크고 둥글어 듬직한 눈이에요. 원전이 그림 위에 "큰 부자(巨富)"라고 적어 둔 눈이에요. 서두르지 않고 쌓아서 크게 이루는 눈이에요.',
  },
  {
    key: 'gwi', hanja: '龜眼', name: '거북의 눈', tag: '有壽', page: '麻衣 p80', p: [-1, -0.5, 0],
    shape: '睛圓', shapeKo: '둥글고 단정한 눈',
    verse: '康寧福壽豐方足 彼遠綿綿及子孫',
    verseKo: '건강하고 평안하며 복과 수명이 넉넉하고, 그 복이 길게 이어져 자손에게까지 미친다.',
    reading: '둥글고 차분한 눈이에요. 안에 빼어난 기운을 감춘(藏秀氣) 눈이라, 오래 가고 대를 잇는 복이 있어요.',
  },
  {
    key: 'sa', hanja: '獅眼', name: '사자의 눈', tag: '富貴', page: '麻衣 p81', p: [0, 1.6, 0],
    shape: '眼大威嚴', shapeKo: '크고 위엄 있는 눈',
    verse: '不貪不酷施仁政 富貴榮華福壽康',
    verseKo: '탐하지도 모질지도 않게 어진 다스림을 펴고, 부귀영화와 복·수명·건강을 누린다.',
    reading: '크고 위엄 있는 눈이에요. 무섭지 않게 사람을 이끄는, 어진 우두머리의 눈이에요.',
  },
];

const clip = (v) => Math.max(-2, Math.min(2, v));

/** 눈 모양 [길이, 크기, 눈꼬리] z 값 */
export const eyeShape = (m) => [clip(z(m, 'eyeAspect')), clip(z(m, 'eyeSize')), clip(z(m, 'eyeTilt'))];

/** 가장 닮은 눈과 두 번째 */
export function eyeTypeOf(m) {
  const s = eyeShape(m);
  const ranked = EYE_TYPES.map((t) => ({
    ...t,
    d: Math.hypot(s[0] - t.p[0], s[1] - t.p[1], s[2] - t.p[2]),
  })).sort((a, b) => a.d - b.d);
  return { best: ranked[0], second: ranked[1], shape: s, traits: traitsOf(s) };
}

/** 측정된 모양을 말로 (닮은 근거로 보여 줌) */
function traitsOf([len, size, tilt]) {
  const t = [];
  if (len > 0.6) t.push('길게 뻗었어요');
  if (len < -0.6) t.push('둥글어요');
  if (size > 0.6) t.push('커요');
  if (size < -0.6) t.push('가늘어요');
  if (tilt > 0.6) t.push('눈꼬리가 올라갔어요');
  if (Math.abs(tilt) <= 0.6) t.push('눈꼬리가 가지런해요');
  return t;
}
