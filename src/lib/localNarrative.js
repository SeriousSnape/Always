// 서버(AI) 연결 전, 기기 안에서 판정 재료(brief)만으로 해설 칸을 채운다.
// AI 해설보다 단조롭지만 원문·직역·측정 결과는 같다. 지어내는 말은 넣지 않는다.
import { josa } from './josa.js';

const short = (part) => part.replace(/\(.*?\)/g, '').trim();
const hasHanja = (s) => /[㐀-鿿]{2,}/.test(s ?? '');
const quote = (f) => (f.quotes.length ? `원전은 ${f.quotes.map((q) => `“${q.t}”`).join(' ')}라고 해요.` : '');

function line(f) {
  if (f.id === 'eye') {
    // 대표 부위: part = '닮은 눈: 코 · 범의 코(虎鼻, 大富)', quotes[1].t = 풀이
    const [organ, name] = f.part.replace('닮은 눈: ', '').split(' · ');
    return `대표 부위는 ${organ}, ${name}예요. ${f.quotes[1]?.t ?? ''}`;
  }
  if (f.grade === 'mid') return `${josa(short(f.part), '은/는')} 보통이에요.`;
  const look = hasHanja(f.look) ? '' : `${f.look}. `;
  return `${short(f.part)} — ${look}${quote(f)}`.trim();
}

function body(sec, brief) {
  const graded = sec.facts.filter((f) => f.grade);
  const notes = sec.facts.filter((f) => !f.grade);
  switch (sec.key) {
    case 'olhae':
      return [
        ...(sec.years ?? []).map((y) => `${y.year}년 ${y.age}세는 ${y.area.replace(/\(.*\)/, '')} 자리 — ${y.look}.`),
        ...graded.map((f) => quote(f)),
      ].join('\n\n');
    case 'gisaek': {
      const items = graded.filter((f) => f.id.startsWith('cx:'));
      if (!items.length) return '이번 사진에서 인당·산근·콧대·코끝·눈꼬리 옆의 빛깔을 두 뺨과 견줘 봤는데, 두드러지게 다른 자리는 없었어요. 원전은 얼굴빛이 보름마다 바뀐다고 하니, 보름쯤 뒤에 다시 찍어 보세요.';
      const note = notes.find((f) => f.id === 'cx:note');
      const bad = items.some((f) => f.grade === 'bad');
      return [...items.map(line), bad && note ? quote(note) : ''].filter(Boolean).join('\n\n');
    }
    case 'gomin':
      return [
        `“${brief.worry}”`,
        `이 고민과 닿는 자리 가운데 받쳐 주는 곳: ${graded.filter((f) => f.grade === 'good').map((f) => short(f.part)).join(', ') || '없음'}.`,
        `조심할 곳: ${graded.filter((f) => f.grade === 'bad').map((f) => short(f.part)).join(', ') || '없음'}.`,
        '관상이 결정을 대신해 줄 수는 없어요. 어느 쪽 힘이 센 얼굴인지만 말해요.',
      ].join('\n\n');
    case 'sseunsori':
      if (!graded.length) return '원전 기준으로 크게 걸리는 자리가 없어요.';
      return ['원문을 바꾸지 않고 그대로 옮길게요.', ...graded.map(line), notes.find((f) => f.id === 'method') ? '다만 원전은 한 부위로 사람을 정하지 않고 얼굴 전체를 함께 봐요.' : '']
        .filter(Boolean)
        .join('\n\n');
    default: {
      // 대표 부위(eye)를 맨 앞에
      const lines = [...graded.filter((f) => f.id === 'eye'), ...graded.filter((f) => f.id !== 'eye')].map(line);
      if (!lines.length) return '이 칸에서 볼 자리는 모두 보통이에요.';
      return lines.join('\n\n');
    }
  }
}

function title(sec) {
  const g = sec.facts.filter((f) => f.grade === 'good' && !f.id.startsWith('zone:') && !f.id.startsWith('cx:'));
  if (sec.key === 'hanmadi') {
    const eye = sec.facts.find((f) => f.id === 'eye');
    const name = eye ? short(eye.part.replace('닮은 눈: ', '').split(' · ')[1] ?? '') : '';
    return name ? `${josa(name, '을/를')} 가진 얼굴` : null;
  }
  if (sec.key === 'sseunsori') return '쓴소리 좀 할게';
  if (['gomin', 'majimak', 'gisaek', 'olhae'].includes(sec.key)) return null;
  if (g.length >= 2) return `${short(g[0].part)}·${josa(short(g[1].part), '이/가')} 받쳐 줘요`;
  return null;
}

/** @returns {{sections:{key,title,body,quotes}[], followups:null, local:true}} */
export function localNarrative(brief, labels) {
  return {
    local: true,
    followups: null,
    sections: brief.sections.map((sec) => ({
      key: sec.key,
      title: title(sec) ?? labels[sec.key],
      body: body(sec, brief),
      quotes: [],
    })),
  };
}
