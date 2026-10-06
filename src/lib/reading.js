// 원전 기반 관상 판정 — docs/관상-기준.md 를 그대로 옮긴 것.
// 麻衣 = 『增補麻衣相法全編』, 衡眞 = 『相理衡眞』 권3. 쪽수는 스캔 PDF 쪽.
// 판정마다 원문(q)·출처(s)·현대어 풀이(t)를 붙이고, 원전에 없는 말은 하지 않는다.
import { z } from './physiognomy.js';

const zz = (m, k) => (m[k] === undefined || m[k] === null ? 0 : z(m, k));
const mix = (...v) => v.reduce((a, b) => a + b, 0) / v.length;
const T = 0.6; // 길·흉 경계(표준편차 단위) — 실제 분포로 보정 필요
const sideKey = (k, side) => (side ? `${k}${side}` : k);

export const GRADE = {
  good: { label: '길(吉)', short: '길', tone: 'good' },
  mid: { label: '평(平)', short: '평', tone: 'mid' },
  bad: { label: '흉(凶)', short: '흉', tone: 'bad' },
  unread: { label: '보지 않음', short: '—', tone: 'unread' },
};

// q: 측정한 부분만 인용한 원문, rest: 원문이 요구하지만 측정하지 못한 조건을 말로 설명
const R = (q, s, t, rest = null) => ({ q, s, t, rest });
const PAID = '정밀 관상에서 봅니다.';
const out = (grade, look, refs = [], note = null) => ({ grade, look, refs, note });
const unread = (why) => out('unread', why);

// ── 판정 항목 ──
// judge(m, ctx) → { grade, look(측정 결과), refs[원문], note }
// ctx = { side: 'L'|'R'|null, forehead: {status, thirds}, gender: 'm'|'f'|null }

const J = {
  // 십이궁
  myung(m) {
    const s = zz(m, 'browGap');
    if (s > T) return out('good', '인당(두 눈썹 사이)이 넓게 트였다', [
      R('印堂 … 闊', '麻衣 p40', '인당은 넓어야 한다.', `원문은 인당이 「평평하고(平) 넓어야(闊)」 한다고 하고, 명궁 결(p165)도 「印堂平正 命宮牢」(평평하고 반듯하면 명궁이 단단하다)라 합니다. 이번엔 넓이만 쟀고, 인당이 평평한지(꺼지거나 솟았는지)는 ${PAID}`),
    ]);
    if (s < -T) return out('bad', '두 눈썹 사이가 좁다', [
      R('眉接交加 貧賤', '麻衣 p33', '눈썹이 맞닿아 엇갈리면 가난하고 천하다.', '원문은 두 눈썹이 실제로 맞닿은 경우를 말합니다. 이번 판정은 두 눈썹 사이가 평균보다 좁다는 것까지이고, 눈썹 털이 이어졌는지는 보지 않았어요.'),
      R('… 兩眉傍 終須貧賤走忙忙', '麻衣 p165', '두 눈썹이 다가붙으면 끝내 빈천하여 바삐 떠돈다.', `원문은 앞에 「인당이 낮게 꺼지고(印堂低陷)」도 함께 말합니다. 인당이 꺼졌는지는 ${PAID}`),
    ]);
    return out('mid', '인당 너비가 보통이다');
  },
  jaebaek(m) {
    const s = mix(zz(m, 'noseLength'), zz(m, 'noseWidth'));
    if (s > T) return out('good', '콧대가 길고 콧방울이 두툼하다', [
      R('… 豐隆 一生財旺', '麻衣 p33', '코가 풍성하면 평생 재물이 왕성하다.', `원문은 「솟고 곧으며(聳直)」 풍성해야 한다고 합니다. 이번엔 콧대 길이와 콧방울 너비만 쟀고, 코가 솟은 높이와 곧음은 ${PAID}`),
    ]);
    if (s < -T) return out('bad', '코가 짧고 콧방울이 좁다', [
      R('尖峰 破財貧寒', '麻衣 p33', '코가 뾰족한 봉우리 같으면 재물을 깨뜨리고 가난하다.', '콧방울이 좁아 코가 뾰족한 쪽으로 봤어요. 코끝이 솟은 모양까지는 보지 않았어요.'),
    ]);
    return out('mid', '코의 길이와 콧방울이 보통이다');
  },
  hyungje(m, { side }) {
    const over = m[sideKey('browOver', side)] ?? m.browOver;
    const eye = zz(m, sideKey('browEye', side));
    if (eye < -1.2) return out('bad', '눈썹이 눈을 누르듯 낮게 붙었다', [
      R('… 塞眼 兄弟疏', '麻衣 p34', '눈썹이 눈을 막으면 형제가 소원하다.', '원문은 「눈썹이 눈을 둘러(環) 막는」 모양을 말합니다. 눈썹과 눈 사이가 좁은 것까지 쟀고, 눈썹이 눈을 감싸는 모양은 보지 않았어요.'),
    ]);
    if (over < 0.1) return out('bad', '눈썹이 눈보다 짧다', [
      R('短 … 同氣連枝見別', '麻衣 p34', '눈썹이 짧으면 한 뿌리의 형제가 갈라진다.', '원문은 「짧고 거칠면(短粗)」이라 합니다. 길이만 쟀고, 눈썹 털이 거친지는 보지 않았어요.'),
    ]);
    if (zz(m, sideKey('browOver', side)) > T) return out('good', '눈썹 끝이 눈꼬리보다 길게 뻗었다', [
      R('眉長過目 三四兄弟無刑', '麻衣 p34', '눈썹이 눈보다 길면 형제 서넛이 서로 해치지 않는다.'),
    ]);
    return out('mid', '눈썹 길이가 보통이다');
  },
  jeontaek(m) {
    if (zz(m, 'eyeAspect') > T && zz(m, 'browEye') > 0) return out('good', '눈이 가늘고 길며 눈썹이 높다', [
      R('鳳目高眉 稅置三州', '麻衣 p35', '봉황 눈에 눈썹이 높으면 세 고을에 땅을 둔다.', '봉황 눈(鳳目)은 가늘고 긴 형상에 맑고 빛나는 눈빛까지 말합니다. 형상(가늘고 김)과 눈썹 높이만 봤고, 눈빛은 사진으로 보지 않았어요.'),
    ]);
    return out('mid', '전택궁(두 눈)은 원전의 길한 형상(鳳目高眉)에 들지 않는다', [], '원전의 전택궁 흉 판정(赤脈侵睛 등)은 눈의 핏발과 빛깔이라 사진으로 보지 않는다.');
  },
  namnyeo(m) {
    const s = zz(m, 'tearFull');
    if (s > T) return out('good', '눈 밑(누당·와잠)이 평평하게 차 있다', [
      R('三陽平滿 兒孫福祿', '麻衣 p35', '눈 밑 삼양이 평평하고 가득하면 자손이 복록을 누린다.', `눈 밑이 찬 정도는 정면 사진 한 장에서 깊이를 추정한 값이라 참고용입니다. 정확한 깊이는 ${PAID}`),
    ]);
    if (s < -T) return out('bad', '눈 밑이 꺼져 있다', [
      R('深陷 … 無緣', '麻衣 p35', '눈 밑이 깊이 꺼지면 자식과 인연이 없다.', `눈 밑이 꺼진 정도는 정면 사진 한 장에서 깊이를 추정한 값이라 참고용입니다. 정확한 깊이는 ${PAID}`),
    ]);
    return out('mid', '눈 밑이 보통이다');
  },
  nobok(m) {
    const s = zz(m, 'chinW');
    if (s > T) return out('good', '턱 끝이 둥글고 넉넉하다', [
      R('頦圓豐滿 侍立成群', '麻衣 p36', '턱이 둥글고 풍만하면 모시는 사람이 무리를 이룬다.'),
    ]);
    if (s < -T) return out('bad', '턱 끝이 뾰족하다', [
      R('地閣尖 … 受恩深而反成怨', '麻衣 p36', '지각이 뾰족하면 은혜를 깊이 입고도 도리어 원망을 산다.', '원문은 「뾰족하고 기울면(尖斜)」이라 합니다. 턱 끝이 좁은 것까지 쟀고, 한쪽으로 기울었는지는 보지 않았어요.'),
    ]);
    return out('mid', '턱 끝 너비가 보통이다');
  },
  cheocheop(m) {
    const s = zz(m, 'jianmenFull');
    if (s > T) return out('good', '눈꼬리 옆(어미·간문)이 평평하게 차 있다', [
      R('豐隆平滿 娶妻財帛盈箱', '麻衣 p36', '풍성하고 평평하게 차면 아내를 얻어 재물이 상자에 가득하다.', `간문이 찬 정도는 깊이 추정값이라 참고용입니다. 정확한 깊이는 ${PAID}`),
      R('奸門 … 有肉 主妻賢', '衡眞 p15', '간문에 살이 있으면 아내가 어질다.', '원문은 「윤기가 있고(光澤)」 살이 있어야 한다고 합니다. 윤기는 기색이라 사진으로 보지 않았어요.'),
    ]);
    if (s < -T) return out('bad', '눈꼬리 옆이 꺼져 있다', [
      R('奸門深陷 常作新郎', '麻衣 p36', '간문이 깊이 꺼지면 늘 새 신랑이 된다(혼인을 여러 번 한다).', `간문이 꺼진 정도는 깊이 추정값이라 참고용입니다. 정확한 깊이는 ${PAID}`),
    ]);
    return out('mid', '눈꼬리 옆이 보통이다');
  },
  jilaek(m) {
    const s = zz(m, 'bridgeDepth');
    if (s > T) return out('good', '산근(콧대 뿌리)이 높이 솟았다', [
      R('隆而豐滿 福祿無窮', '麻衣 p37', '산근이 솟고 풍만하면 복록이 끝이 없다.', `산근 높이는 정면 사진에서 깊이를 추정한 값이라 참고용입니다.`),
      R('山根連鼻梁 豐隆而起', '衡眞 p14', '산근이 콧대와 이어져 풍성하게 솟았다.', `원문은 이어서 「이마와 평평하면(與額平) 삼공의 자리에 오른다(位至三公)」고 합니다. 산근과 이마의 높이 관계는 옆모습이 있어야 재므로 ${PAID}`),
    ]);
    if (s < -T) return out('bad', '산근이 낮다', [
      R('… 低陷 連年宿疾', '麻衣 p37', '산근이 낮게 꺼지면 해마다 묵은 병이 있다.', `원문은 「주름과 흉터(紋痕)가 있고」도 함께 말합니다. 주름·흉터는 보지 않았고, 산근 높이는 깊이 추정값이라 참고용입니다. 정확한 높이는 ${PAID}`),
      R('山根 … 低者 主孤貧', '衡眞 p14', '산근이 낮으면 외롭고 가난하다.', '원문은 「좁고 낮으면(狹而低)」이라 합니다. 높이만 쟀고 산근의 폭은 보지 않았어요.'),
    ]);
    return out('mid', '산근 높이가 보통이다');
  },
  cheoni(m) {
    if (zz(m, 'asym') > 2 * T) return out('bad', '얼굴의 좌우가 기울어 있다', [
      R('天地偏斜 十居九變', '麻衣 p37', '하늘(이마)과 땅(턱)이 기울면 열 번 살면 아홉 번 옮긴다.'),
    ]);
    if (zz(m, 'browGap') < -2 * T) return out('bad', '두 눈썹이 이어질 듯 가깝다', [
      R('眉連交接 破祖離家', '麻衣 p37', '눈썹이 이어져 맞닿으면 조상의 터를 깨고 집을 떠난다.', '두 눈썹 사이가 매우 좁은 것까지 쟀고, 눈썹 털이 실제로 이어졌는지는 보지 않았어요.'),
    ]);
    const s = zz(m, 'foreheadW');
    if (s > T) return out('good', '이마 양옆(천창)이 넓게 찼다', [
      R('… 豐盈 華彩無憂', '麻衣 p37', '(천창이) 풍만하면 화려하고 근심이 없다.', `원문은 「솟고(隆) 가득해야」 한다고 합니다. 이마 양옆의 너비만 쟀고, 솟은 정도는 ${PAID}`),
    ]);
    if (s < -T) return out('bad', '이마 양옆이 좁다', [
      R('額角低陷 到老住場難', '麻衣 p37', '이마 모서리가 낮게 꺼지면 늙도록 머물 곳이 어렵다.', `원문은 이마 모서리가 「꺼진(陷)」 것을 말합니다. 이번엔 이마 양옆이 좁은 것을 쟀고, 꺼진 깊이는 ${PAID}`),
    ]);
    return out('mid', '이마 양옆이 보통이다');
  },
  gwanrok(m, { forehead }) {
    const vis = forehead?.status === 'visible';
    const h = vis ? (forehead.thirds.upper - 1 / 3) / 0.03 : null;
    const s = vis ? mix(zz(m, 'foreheadW'), h) : zz(m, 'foreheadW');
    const note = vis ? null : '이마가 드러나지 않아 이마 높이는 보지 않고 너비만 봤다.';
    if (s > T) return out('good', vis ? '이마가 높고 넓다' : '이마가 넓다', [
      R('天庭方正 位公卿', '麻衣 p169', '천정이 반듯하면 공경의 자리에 오른다.'),
      R('額角堂堂', '麻衣 p37', '이마 모서리가 당당하다.'),
    ], note);
    if (s < -T) return out('bad', vis ? '이마가 낮고 좁다' : '이마가 좁다', [
      R('髮低額窄 少前程', '麻衣 p169', '머리털이 낮고 이마가 좁으면 앞길이 적다.'),
    ], note);
    return out('mid', '이마가 보통이다', [], note);
  },
  bokdeok(m) {
    const F = zz(m, 'foreheadW');
    const C = zz(m, 'chinW');
    if (F - C > 2 * T) return out('bad', '이마는 넓은데 턱 끝이 뾰족하다', [
      R('額闊頦尖 迍邅在晚歲', '麻衣 p38', '이마가 넓고 턱이 뾰족하면 늘그막에 고생한다.'),
    ]);
    if (C - F > 2 * T) return out('bad', '턱은 둥근데 이마가 좁다', [
      R('頦圓額窄 須知苦在初年', '麻衣 p38', '턱이 둥글고 이마가 좁으면 초년에 고생이 있다.'),
    ]);
    if (F > T / 2 && C > T / 2) return out('good', '이마와 턱이 함께 넉넉하다', [
      R('天地相朝 德行須全', '麻衣 p38', '하늘과 땅(이마와 턱)이 서로 마주하면 덕행이 온전하다.'),
    ]);
    return out('mid', '이마와 턱의 균형이 보통이다');
  },
  bumo(m) {
    const a = m.browAsym ?? 0;
    if (a > 0.12) return out('bad', '왼쪽 눈썹이 오른쪽보다 높다', [
      R('左眉高右眉低 父在母先歸', '麻衣 十二宮秘訣 p39~40', '왼쪽 눈썹이 높고 오른쪽이 낮으면 아버지가 계실 때 어머니가 먼저 돌아가신다.'),
    ]);
    if (zz(m, 'browGap') < -2 * T && zz(m, 'foreheadW') < -T) return out('bad', '이마가 좁고 눈썹이 맞닿았다', [
      R('額削眉交 父母早拋', '麻衣 十二宮秘訣 p39~40', '이마가 깎이고 눈썹이 맞닿으면 부모를 일찍 여읜다.', '이마가 좁고 두 눈썹 사이가 매우 좁은 것까지 쟀고, 눈썹 털이 실제로 이어졌는지는 보지 않았어요.'),
    ]);
    return out('mid', '눈썹 높이가 좌우 고르다', [], '부모궁의 본 자리인 일각·월각(이마 위 양쪽)의 높고 둥긂은 사진으로 보지 않는다.');
  },

  // 오악
  jungak(m) {
    const s = mix(zz(m, 'noseLength'), zz(m, 'bridgeDepth'), zz(m, 'noseMidHeight'));
    if (s > T) return out('good', '코가 높이 솟았다', [R('中嶽要得高隆', '麻衣 p41', '중악(코)은 높이 솟아야 한다.', `코 높이는 깊이 추정값이 섞여 참고용입니다. 정확한 높이는 ${PAID}`)]);
    if (s < -T) return out('bad', '코가 낮고 얇다', [R('中嶽薄而無勢 則四嶽無主', '麻衣 p41', '중악이 얇고 기세가 없으면 나머지 네 산에 주인이 없다.', `코 높이는 깊이 추정값이 섞여 참고용입니다. 정확한 높이는 ${PAID}`)]);
    return out('mid', '코의 높이가 보통이다');
  },
  dongseo(m) {
    const s = zz(m, 'cheekProm');
    if (s > T) return out('good', '두 광대가 솟았다', [
      R('東西嶽須聳而朝應', '麻衣 p41', '동악·서악(두 광대)은 솟아서 서로 응해야 한다.', `광대가 솟은 정도는 깊이 추정값이라 참고용입니다. 정확한 높이는 ${PAID}`),
      R('顴 … 端聳豐 … 有權勢', '衡眞 p20', '광대가 반듯하게 솟고 풍성하면 권세가 있다.', '원문은 「윤기(澤)」도 함께 말하는데, 윤기는 기색이라 사진으로 보지 않았어요.'),
    ]);
    if (s < -T) return out('bad', '두 광대가 낮다', [R('顴 … 低陷者 無勢', '衡眞 p20', '광대가 낮게 꺼지면 권세가 없다.', `광대 높이는 깊이 추정값이라 참고용입니다. 정확한 높이는 ${PAID}`)]);
    return out('mid', '광대가 보통이다');
  },
  namak(m, { forehead }) {
    if (zz(m, 'foreheadTilt') > 2 * T) return out('bad', '이마가 한쪽으로 기울었다', [R('南嶽傾側 主見破', '麻衣 p41', '남악(이마)이 기울면 깨어짐을 본다.')]);
    if (forehead?.status === 'visible' && forehead.thirds.upper > 1 / 3 + 0.02) return out('good', '이마가 높고 반듯하다', [
      R('天庭高廣 少年富貴', '衡眞 p9', '천정이 높고 넓으면 젊어서 부귀하다.'),
    ]);
    return out('mid', '이마가 반듯하다', [], forehead?.status === 'visible' ? null : '이마가 드러나지 않아 높이는 보지 않았다.');
  },
  bukak(m) {
    const s = mix(zz(m, 'chinW'), zz(m, 'jaw'));
    if (s > T) return out('good', '턱이 반듯하고 넉넉하다', [R('地閣 … 端方 … 者 貴而富', '衡眞 p31', '지각이 반듯하고 모나면(넉넉하면) 귀하고 부유하다.', `원문은 「평평하고 두터워야(平厚)」도 말합니다. 턱의 너비만 쟀고, 턱이 앞으로 나온 두께는 옆모습이 있어야 재므로 ${PAID}`)]);
    if (s < -T) return out('bad', '턱이 뾰족하고 좁다', [
      R('北嶽尖 … 末主無成', '麻衣 p41', '북악(턱)이 뾰족하면 말년에 이루는 것이 없다.', `원문은 「뾰족하거나 꺼지면(尖陷)」이라 합니다. 턱이 좁은 것까지 쟀고, 꺼진(뒤로 들어간) 정도는 ${PAID}`),
      R('地閣 … 狹 … 削小者 貧賤', '衡眞 p31', '지각이 좁고 깎여 작으면 가난하고 천하다.', '원문의 「얇음(薄)」은 턱의 두께라 옆모습이 있어야 봅니다.'),
    ]);
    return out('mid', '턱이 보통이다');
  },

  // 오관
  // 보수관은 형제궁과 같은 눈썹을 보지만, 오관의 원문(麻衣 p40·論眉)으로 따로 판정한다
  bosu(m, ctx) {
    const h = J.hyungje(m, ctx);
    const over = m[sideKey('browOver', ctx.side)] ?? m.browOver;
    if (over < 0.1) return out('bad', '눈썹이 눈보다 짧다', [R('眉短於目 心性孤獨', '麻衣 論眉 p69~76', '눈썹이 눈보다 짧으면 마음이 외롭다.')]);
    if (zz(m, 'browGap') < -2 * T) return out('bad', '두 눈썹 머리가 맞닿을 듯하다', [R('眉頭交 貧薄 妨兄弟', '麻衣 論眉 p69~76', '눈썹 머리가 맞닿으면 가난하고 형제를 해친다.', '두 눈썹 사이가 매우 좁은 것까지 쟀고, 눈썹 머리가 실제로 맞닿았는지는 보지 않았어요.')]);
    if (h.grade === 'good' && zz(m, sideKey('browEye', ctx.side)) > -T) return out('good', '눈썹이 눈보다 길고 두 눈썹이 떨어져 높이 자리했다', [
      R('… 長 雙分 … 高居額中', '麻衣 p40', '보수관(눈썹)은 길고, 둘로 나뉘며, 이마 가운데 높이 자리해야 이루어진다.', '원문은 「넓고 맑으며(寬廣清)」 「귀밑머리로 들어가야(入鬢)」도 말합니다. 눈썹 털의 맑음과 결은 사진으로 보지 않았어요.'),
    ]);
    return out('mid', '눈썹이 보통이다', [], h.grade === 'bad' ? '눈썹이 눈을 누르는 모양은 형제궁에서 따로 봅니다.' : null);
  },
  gamchal(m, { side }) {
    const refs = [];
    let score = 0;
    const tilt = m[sideKey('eyeTilt', side)] ?? m.eyeTilt;
    if (zz(m, sideKey('eyeAspect', side)) > T) {
      score++;
      refs.push(R('目 … 長 近君王', '麻衣 相目 p78', '눈이 길면 임금 가까이 간다.', '원문은 「빼어나고(秀) 길면」이라 합니다. 빼어남은 눈빛(神)을 포함해 사진으로 보지 않았고, 길이(가늘고 김)만 봤어요.'));
    }
    if (tilt > 0.1) {
      score++;
      refs.push(R('目尾朝天 福祿綿綿', '麻衣 相目 p78', '눈꼬리가 하늘을 향하면 복록이 끊이지 않는다.'));
    } else if (tilt < -0.03) {
      score--;
      refs.push(R('目尾相垂 夫妻相離', '麻衣 相目 p78', '눈꼬리가 아래로 처지면 부부가 서로 떨어진다.'));
    }
    if (zz(m, 'eyeSize') < -2 * T) {
      score--;
      refs.push(R('短小 賤', '麻衣 相目 p77~78', '눈이 짧고 작으면 천하다.'));
    }
    const look = [
      zz(m, sideKey('eyeAspect', side)) > T ? '눈이 가늘고 길다' : null,
      tilt > 0.1 ? '눈꼬리가 위를 향한다' : tilt < -0.03 ? '눈꼬리가 아래로 처졌다' : null,
      zz(m, 'eyeSize') < -2 * T ? '눈이 작다' : null,
    ].filter(Boolean).join(', ') || '눈의 형상이 보통이다';
    const note = '감찰관의 핵심인 눈빛(神)과 흑백의 분명함은 사진으로 보지 않았다.';
    return out(score > 0 ? 'good' : score < 0 ? 'bad' : 'mid', look, refs, note);
  },
  simbyeon(m) {
    const s = mix(zz(m, 'bridgeDepth'), zz(m, 'noseMidHeight'), zz(m, 'noseWidth'));
    if (zz(m, 'noseWidth') < -2 * T) return out('bad', '준두(코끝)가 좁고 뾰족하다', [R('準頭尖削 好爲奸詐', '麻衣 相鼻 p90~95', '준두가 뾰족하게 깎이면 간사한 짓을 좋아한다.')]);
    if (zz(m, 'noseMidHeight') < -2 * T) return out('bad', '콧대가 낮다', [R('鼻梁無骨 夭', '麻衣 相鼻 p90~95', '콧대에 뼈가 없으면 일찍 죽는다.', `콧대 높이는 깊이 추정값이라 참고용입니다. 콧대가 실제로 낮은지는 ${PAID}`)]);
    if (s > T) return out('good', '산근에서 연상·수상까지 높고 콧방울이 일어났다', [
      R('… 年壽高隆 準圓庫起', '麻衣 p40', '심변관(코)은 연상·수상이 높이 솟고, 준두가 둥글고 콧방울이 일어나야 이루어진다.', `원문은 앞에 「콧대가 곧고(梁柱端直) 산근이 인당에 이어져야(山根連印)」도 말합니다. 콧대의 곧음은 고개 각도와 구별되지 않아 보지 않았고, 높이는 깊이 추정값이라 정확한 값은 ${PAID}`),
    ]);
    return out('mid', '코가 보통이다', [], '콧대가 곧은지(端直)는 고개 각도와 구별되지 않아 보지 않았다.');
  },
  chulnap(m, { gender }) {
    const refs = [];
    let score = 0;
    const looks = [];
    const w = zz(m, 'mouthWidth');
    if (w > T) {
      score++;
      looks.push('입이 크다');
      refs.push(R('口闊 … 必定有財有祿', '衡眞 p28', '입이 넓으면 반드시 재물과 녹봉이 있다.', '원문은 「입술이 모나야(唇方)」도 함께 말합니다. 입술 모양의 모남은 보지 않았어요.'));
      if (gender === 'm') refs.push(R('男人口闊 喫十方', '衡眞 p26', '남자 입이 넓으면 사방에서 먹을 것을 얻는다.'));
      if (gender === 'f') {
        score--;
        refs.push(R('女人口闊 守空房', '衡眞 p26', '여자 입이 넓으면 빈 방을 지킨다.'));
      }
    } else if (w < -2 * T) {
      score--;
      looks.push('입이 작다');
      refs.push(R('口小而短者 貧', '麻衣 相口 p99~100', '입이 작고 짧으면 가난하다.'));
    }
    if (m.mouthCorner > 0.03) {
      score++;
      looks.push('입꼬리가 올라갔다');
      refs.push(R('口角如弓 位至三公', '麻衣 相口 p100', '입꼬리가 활처럼 올라가면 삼공의 자리에 오른다.'));
    } else if (m.mouthCorner < -0.03) {
      score--;
      looks.push('입꼬리가 처졌다');
      refs.push(R('口垂兩角 衣食難求', '麻衣 相口 p100', '입 양끝이 처지면 입고 먹을 것을 구하기 어렵다.'));
    }
    const up = zz(m, 'upperLip');
    const lo = zz(m, 'lowerLip');
    if (up > T && lo > T) {
      score++;
      looks.push('입술이 위아래 모두 두툼하다');
      refs.push(R('上下俱厚 忠信', '麻衣 相唇 p106', '위아래 입술이 모두 두터우면 충성스럽고 믿음직하다.'));
    } else if (up < -T && lo < -T) {
      score--;
      looks.push('입술이 위아래 모두 얇다');
      refs.push(R('上下俱薄 妄語下劣', '麻衣 相唇 p106', '위아래 입술이 모두 얇으면 망령된 말을 하고 하찮다.'));
    } else if (up < -2 * T) {
      score--;
      looks.push('윗입술이 얇다');
      refs.push(R('上唇薄 言語狡詐', '麻衣 相唇 p106', '윗입술이 얇으면 말이 교활하다.'));
    } else if (lo < -2 * T) {
      score--;
      looks.push('아랫입술이 얇다');
      refs.push(R('下唇薄 貧寒', '麻衣 相唇 p106', '아랫입술이 얇으면 가난하고 춥다.'));
    }
    return out(score > 0 ? 'good' : score < 0 ? 'bad' : 'mid', looks.join(', ') || '입이 보통이다', refs, '입술 빛깔(唇紅)은 사진으로 보지 않았다.');
  },

  // 인중
  injung(m) {
    const s = zz(m, 'philtrum');
    if (s > T) return out('good', '인중이 길다', [
      R('人中之長短 可定壽命之長短', '麻衣 相人中 p98', '인중의 길고 짧음으로 수명의 길고 짧음을 정한다.'),
      R('欲長而不欲縮', '衡眞 p23', '인중은 길어야 하고 오그라들면 안 된다.', `원문은 「깊고 길면 오래 산다(深而長 長壽)」처럼 깊이도 함께 봅니다. 인중의 깊이는 ${PAID}`),
    ], '인중의 깊이는 사진으로 보지 않았다.');
    if (s < -T) return out('bad', '인중이 짧다', [
      R('人中之長短 可定壽命之長短', '麻衣 相人中 p98', '인중의 길고 짧음으로 수명의 길고 짧음을 정한다.', `원문은 「얕고 짧으면 일찍 죽는다(淺而短 夭亡)」고 깊이와 길이를 함께 봅니다. 이번엔 짧은 것만 확인했고, 인중의 깊이는 ${PAID}`),
    ], '인중의 깊이는 사진으로 보지 않았다.');
    return out('mid', '인중 길이가 보통이다', [], '인중의 깊이는 사진으로 보지 않았다.');
  },
};

// ── 묶음 정의 ──
export const PALACES = [
  ['myung', '명궁', '命宮', '인당', '운명 전체', 'A'],
  ['jaebaek', '재백궁', '財帛宮', '코', '재물', 'A'],
  ['hyungje', '형제궁', '兄弟宮', '눈썹', '형제·벗', 'A'],
  ['jeontaek', '전택궁', '田宅宮', '두 눈', '집과 땅', 'A'],
  ['namnyeo', '남녀궁', '男女宮', '눈 밑(누당)', '자녀', 'B'],
  ['nobok', '노복궁', '奴僕宮', '지각(턱 끝)', '아랫사람', 'A'],
  ['cheocheop', '처첩궁', '妻妾宮', '어미·간문(눈꼬리 옆)', '배우자', 'B'],
  ['jilaek', '질액궁', '疾厄宮', '산근', '질병·재액', 'B'],
  ['cheoni', '천이궁', '遷移宮', '이마 양옆(천창)', '이동·거처', 'A'],
  ['gwanrok', '관록궁', '官祿宮', '이마 가운데(중정)', '벼슬·명예', 'A'],
  ['bokdeok', '복덕궁', '福德宮', '천창과 지각', '타고난 복', 'A'],
  ['sangmo', '상모궁', '相貌宮', '얼굴 전체(오악·삼정)', '전체 모습', 'A'],
  ['bumo', '부모궁', '父母宮', '일월각·눈썹', '부모', 'A'],
].map(([key, name, hanja, area, domain, conf]) => ({ key, name, hanja, area, domain, conf }));

export const WUYUE = [
  ['namak', '남악(형산)', '이마'],
  ['dongseo', '동·서악(태산·화산)', '두 광대'],
  ['jungak', '중악(숭산)', '코'],
  ['bukak', '북악(항산)', '턱'],
].map(([key, name, area]) => ({ key, name, area, conf: key === 'dongseo' || key === 'jungak' ? 'B' : 'A' }));

export const WUGUAN = [
  ['bosu', '보수관', '保壽官', '눈썹'],
  ['gamchal', '감찰관', '監察官', '눈'],
  ['simbyeon', '심변관', '審辨官', '코'],
  ['chulnap', '출납관', '出納官', '입'],
  ['chaecheong', '채청관', '採聽官', '귀'],
].map(([key, name, hanja, area]) => ({ key, name, hanja, area }));

function judgeSangmo(results, thirds) {
  const vals = WUYUE.map((w) => results[w.key].grade);
  const good = vals.filter((g) => g === 'good').length;
  const bad = vals.filter((g) => g === 'bad').length;
  if (bad >= 2 || thirds.grade === 'bad') return out('bad', '오악이나 삼정에 이지러진 곳이 있다', [
    R('若有虧陷 斷爲凶惡', '麻衣 p38', '(오악·삼정에) 이지러지고 꺼진 데가 있으면 흉하다고 판단한다.'),
  ]);
  if (good >= 2 && bad === 0) {
    const refs = [R('五嶽朝聳 官祿榮遷', '麻衣 p38', '오악이 솟아 서로 향하면 벼슬과 녹봉이 영화롭게 오른다.')];
    if (thirds.grade === 'good') refs.push(R('三停俱等 永保平生顯達', '麻衣 p38', '삼정이 모두 고르면 평생 높이 드러남을 길이 지킨다.'));
    return out('good', '오악이 고르게 솟았다', refs);
  }
  return out('mid', '오악이 고르다');
}

/** 삼정: 머리선이 보일 때만 판정 */
export function judgeThirds(forehead) {
  if (forehead?.status !== 'visible') {
    return {
      ...unread(`${forehead?.reason ?? '이마를 확인하지 못했어요'}. 원전은 상정을 머리선(髮際)부터 재므로 상정(초년)과 삼정의 균형은 판정하지 않습니다. 이마를 드러내고 찍으면 볼 수 있어요.`),
      parts: null,
    };
  }
  const t = forehead.thirds;
  const vals = [t.upper, t.middle, t.lower];
  const ratio = Math.max(...vals) / Math.min(...vals);
  const parts = [
    { name: '상정', ages: '초년(15~30세)', area: '머리선~인당', v: t.upper },
    { name: '중정', ages: '중년(31~50세)', area: '인당~준두', v: t.middle },
    { name: '하정', ages: '말년(51세~)', area: '인중~지각', v: t.lower },
  ];
  const refs = [];
  if (t.upper > 0.36) refs.push(R('上停 … 滿者 主初年福祿', '衡眞 p4', '상정이 가득하면 초년에 복록이 있다.', `원문은 「솟고(隆) 가득하면」이라 합니다. 상정의 길이만 쟀고, 이마가 솟은 정도는 ${PAID}`));
  if (t.middle > 0.36) refs.push(R('中停豐 … 者 主中年成立', '衡眞 p4', '중정이 넉넉하면 중년에 일어선다.', `원문의 「두터움(厚)」은 코의 높이라 ${PAID}`));
  if (t.lower < 0.3) refs.push(R('下停缺陷者 主晚年破敗', '衡眞 p4', '하정이 이지러지면 말년에 무너진다.'));
  if (ratio < 1.12) return { ...out('good', '세 정의 길이가 고르다', [R('三停平等 富貴榮顯', '麻衣 p49', '삼정이 고르면 부귀하고 영화롭게 드러난다.'), ...refs]), parts };
  if (ratio > 1.3) return { ...out('bad', '세 정의 길이가 고르지 않다', [R('三停不均 孤夭貧賤', '麻衣 p49', '삼정이 고르지 않으면 외롭고 일찍 죽으며 가난하고 천하다.'), ...refs]), parts };
  return { ...out('mid', '세 정의 길이가 대체로 고르다', refs), parts };
}

/**
 * 전체 판정
 * @param {object} m 측정 지표
 * @param {{forehead?:object, gender?:'m'|'f'|null}} opts
 */
export function readFace(m, { forehead = null, gender = null } = {}) {
  const ctx = { side: null, forehead, gender };
  const r = {};
  for (const k of Object.keys(J)) r[k] = J[k](m, ctx);
  r.chaecheong = unread('귀는 정면 사진에서 보이지 않아 판정하지 않습니다.');
  const thirds = judgeThirds(forehead);
  r.sangmo = judgeSangmo(r, thirds);

  const palaces = PALACES.map((p) => ({ ...p, ...r[p.key] }));
  const wuyue = WUYUE.map((w) => ({ ...w, ...r[w.key] }));
  const wuguan = WUGUAN.map((w) => ({ ...w, ...r[w.key] }));
  const formed = wuguan.filter((w) => w.grade === 'good').length;

  return {
    results: r,
    thirds,
    palaces,
    wuyue,
    wuguan,
    wuguanSummary: {
      formed,
      refs: [R('一官成 十年之貴顯 / 五官俱成 其貴老終', '麻衣 p40', '한 관이 이루어지면 십 년 귀하게 드러나고, 오관이 모두 이루어지면 늙도록 귀하다.')],
      text: `네 관 중 ${formed}개가 이루어졌다.`,
    },
    injung: r.injung,
    relations: relationsOf(r),
    summary: summaryOf(r, palaces),
  };
}

/** 관계: 원전은 상대 얼굴이 아니라 내 얼굴의 해당 자리로 본다 */
function relationsOf(r) {
  return [
    { who: '형제·벗', items: [['형제궁(눈썹)', r.hyungje]] },
    { who: '배우자', items: [['처첩궁(간문)', r.cheocheop], ['눈꼬리(目尾)', r.gamchal], ['산근', r.jilaek]] },
    { who: '자녀', items: [['남녀궁(누당)', r.namnyeo]] },
    { who: '아랫사람', items: [['노복궁(지각)', r.nobok]] },
    { who: '부모', items: [['부모궁', r.bumo]] },
  ];
}

const W = { gamchal: 5, gwanrok: 3, namak: 3, bosu: 2, simbyeon: 2, chulnap: 2 };
const NUM = { good: 1, mid: 0, bad: -1 };

/** 총평: 達磨 第四法 가중치 + 第五法 */
function summaryOf(r, palaces) {
  let sum = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(W)) {
    if (r[k].grade === 'unread') continue;
    sum += NUM[r[k].grade] * w;
    wsum += w;
  }
  const overall = wsum ? sum / wsum : 0;
  // 상모궁은 다른 자리를 합친 판정이라 '가장 좋은/약한 자리'에서는 뺀다
  const order = palaces.filter((p) => p.grade !== 'unread' && p.key !== 'sangmo');
  const best = order.find((p) => p.grade === 'good') ?? null;
  const worst = order.find((p) => p.grade === 'bad') ?? null;
  return {
    overall,
    grade: overall > 0.25 ? 'good' : overall < -0.25 ? 'bad' : 'mid',
    best,
    worst,
    goods: order.filter((p) => p.grade === 'good').map((p) => p.name),
    bads: order.filter((p) => p.grade === 'bad').map((p) => p.name),
    method: [
      R('人面分十分 眼五分 額三分 眉口鼻耳二分', '麻衣 達磨相訣 p145', '얼굴을 열로 나누면 눈이 다섯, 이마가 셋, 눈썹·입·코·귀가 둘이다.'),
      R('問貴在眼 問富在鼻 問壽在神 求全在聲', '麻衣 達磨相訣 p146', '귀함은 눈에, 재물은 코에, 수명은 신(神)에, 온전함은 소리에 묻는다.'),
    ],
    pillars: [
      { q: '貴', name: '귀(貴) — 눈', grade: r.gamchal.grade },
      { q: '富', name: '부(富) — 코', grade: r.jaebaek.grade },
      { q: '壽', name: '수(壽) — 신(神)', grade: 'unread' },
      { q: '全', name: '전(全) — 소리', grade: 'unread' },
    ],
  };
}

// ── 유년운기 (麻衣 p29~31) ──
// [시작, 끝, 부위, 판정키, 좌우 있음]
export const ZONES = [
  [1, 14, '귀(천륜·인륜·지륜)', null],
  [15, 15, '화성(이마 한가운데)', 'forehead'],
  [16, 16, '천중', 'forehead'],
  [17, 18, '일각·월각', 'forehead'],
  [19, 19, '천정', 'forehead'],
  [20, 21, '보각', 'cheoni'],
  [22, 22, '사공', 'forehead'],
  [23, 24, '변성', 'cheoni'],
  [25, 25, '중정', 'forehead'],
  [26, 27, '구릉·총묘', null],
  [28, 28, '인당', 'myung'],
  [29, 30, '산림', 'cheoni'],
  [31, 34, '눈썹(능운·자기·번하·채하)', 'bosu', true],
  [35, 40, '눈(태양·태음·중양·중음·소양·소음)', 'gamchal', true],
  [41, 41, '산근', 'jilaek'],
  [42, 43, '정사·광전', 'jilaek'],
  [44, 45, '연상·수상', 'simbyeon'],
  [46, 47, '광대(관골)', 'dongseo'],
  [48, 48, '준두', 'jaebaek'],
  [49, 50, '난대·정위', 'jaebaek'],
  [51, 51, '인중', 'injung'],
  [52, 55, '선고·식창·녹창', null],
  [56, 57, '법령', null],
  [58, 59, '호이', null],
  [60, 60, '수성(입)', 'chulnap'],
  [61, 61, '승장', null],
  [62, 63, '지고', 'bukak'],
  [64, 65, '파지·아압', null],
  [66, 69, '금루·귀래', 'nobok'],
  [70, 70, '송당', null],
  [71, 71, '지각', 'bukak'],
  [72, 73, '노복', 'nobok'],
  [74, 75, '시골(턱뼈)', 'nobok'],
  [76, 99, '얼굴 둘레 십이지(자~해)', null],
  [100, 150, '송당·조상(다시 돎)', null],
].map(([from, to, area, key, paired]) => ({ from, to, area, key, paired: !!paired }));

const UNREAD_WHY = {
  null: '이 나이를 맡은 자리는 사진으로 판정할 수 없어(귀·주름·얼굴 둘레 등) 보지 않습니다.',
};

export const ZONE_RULE = [
  R('若逢部位好 順時氣色見光晶', '麻衣 p31', '그 해를 맡은 부위가 좋으면 때를 따라 순조롭다.'),
  R('更逢破敗 屬幽冥', '麻衣 p31', '그 부위가 깨지고 무너졌으면 어둠(저승)에 속한다.'),
];

/** 이마 위쪽 자리(천중·천정·사공·중정 등)는 이마가 드러나야 판정 */
function foreheadJudge(forehead) {
  if (forehead?.status !== 'visible') return unread(`${forehead?.reason ?? '이마를 확인하지 못했어요'}. 이마 위쪽 자리는 이마를 드러내고 찍어야 볼 수 있어요.`);
  const u = forehead.thirds.upper;
  if (u > 0.36) return out('good', '이마가 높다', [R('天庭高廣 少年富貴', '衡眞 p9', '천정이 높고 넓으면 젊어서 부귀하다.')]);
  if (u < 0.3) return out('bad', '이마가 낮다', [R('髮低額窄 少前程', '麻衣 p169', '머리털이 낮고 이마가 좁으면 앞길이 적다.')]);
  return out('mid', '이마 높이가 보통이다');
}

/** 세는 나이 */
export const koreanAge = (birthYear, thisYear = new Date().getFullYear()) => thisYear - birthYear + 1;
export const zoneAt = (age) => ZONES.find((z) => age >= z.from && age <= z.to) ?? null;

/** 한 자리의 판정 (男左女右) */
export function judgeZone(zone, m, { forehead = null, gender = null } = {}) {
  if (!zone.key) return unread(UNREAD_WHY.null);
  if (zone.key === 'forehead') return foreheadJudge(forehead);
  const side = zone.paired ? (gender === 'm' ? 'L' : gender === 'f' ? 'R' : null) : null;
  return J[zone.key](m, { side, forehead, gender });
}

export function yearlyFlow(m, birthYear, opts = {}, thisYear = new Date().getFullYear()) {
  const list = [];
  for (let i = 0; i < 5; i++) {
    const year = thisYear + i;
    const age = koreanAge(birthYear, year);
    const zone = zoneAt(age);
    const j = judgeZone(zone, m, opts);
    list.push({ year, age, area: zone.area, range: zone.from === zone.to ? `${zone.from}세` : `${zone.from}~${zone.to}세`, paired: zone.paired, ...j });
  }
  return list;
}

/** 관상도용: 모든 운기 자리의 판정 */
export function zoneGrades(m, opts = {}) {
  return ZONES.map((z) => ({ ...z, grade: judgeZone(z, m, opts).grade }));
}
