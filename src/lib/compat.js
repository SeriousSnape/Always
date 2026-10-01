// 두 사람의 궁합 점수 — 일간 합·생극, 일지 합·충, 얼굴 오행형, 서로의 부족 오행
import { josa } from './josa.js';
import { ELEMENTS, STEM_ELEMENT, BRANCH_ELEMENT, STEM_COMBINE, BRANCH_SIX_COMBINE, branchClash, elementRelation, lackingElement } from './saju.js';

/**
 * 관계도에 쓰는 사람 요약(공유 링크에도 이 정보만 담는다 — 생년월일 원본은 담지 않음)
 * @typedef {{name:string, ds:number, db:number, counts:number[], face:number|null}} Person
 */

export function toPerson(name, saju, face) {
  return { name, ds: saju.pillars.day.stem, db: saju.pillars.day.branch, counts: saju.counts, face: face ?? null };
}

const dominant = (counts) => counts.indexOf(Math.max(...counts));

export function compatibility(a, b) {
  let score = 55;
  const why = [];
  const ea = STEM_ELEMENT[a.ds];
  const eb = STEM_ELEMENT[b.ds];

  if (STEM_COMBINE[a.ds] === b.ds) {
    score += 18;
    why.push('일간 천간합 — 만나면 서로 끌리는 인연');
  }
  const rel = elementRelation(ea, eb);
  if (rel === 'same') {
    score += 6;
    why.push(`같은 ${ELEMENTS[ea]} 일간 — 말 안 해도 통하는 사이`);
  } else if (rel === 'gen' || rel === 'genBy') {
    score += 10;
    why.push(rel === 'gen' ? `${josa(a.name, '이/가')} ${josa(b.name, '을/를')} 키워 주는 관계` : `${josa(b.name, '이/가')} ${josa(a.name, '을/를')} 키워 주는 관계`);
  } else {
    score -= 8;
    why.push(rel === 'ctrl' ? `${josa(a.name, '이/가')} ${josa(b.name, '을/를')} 휘어잡는 관계` : `${josa(b.name, '이/가')} ${josa(a.name, '을/를')} 휘어잡는 관계`);
  }

  if (BRANCH_SIX_COMBINE[a.db] === b.db) {
    score += 14;
    why.push('일지 육합 — 함께 있으면 편안한 궁합');
  } else if (branchClash(a.db, b.db)) {
    score -= 14;
    why.push('일지 충 — 부딪히지만 그만큼 자극이 되는 사이');
  } else if (BRANCH_ELEMENT[a.db] === BRANCH_ELEMENT[b.db]) {
    score += 4;
  }

  if (a.face !== null && b.face !== null) {
    const fr = elementRelation(a.face, b.face);
    if (fr === 'gen' || fr === 'genBy') {
      score += 6;
      why.push('관상 오행이 서로 살려 주는 얼굴 궁합');
    } else if (fr === 'ctrl' || fr === 'ctrlBy') {
      score -= 4;
      why.push('관상 오행이 부딪히는 얼굴 — 첫인상은 어색했을 수도');
    }
  }

  if (dominant(b.counts) === lackingElement(a.counts)) {
    score += 6;
    why.push(`${josa(b.name, '이/가')} ${a.name}에게 부족한 ${ELEMENTS[lackingElement(a.counts)]} 기운을 채워 줌`);
  }
  if (dominant(a.counts) === lackingElement(b.counts)) {
    score += 6;
    why.push(`${josa(a.name, '이/가')} ${b.name}에게 부족한 ${ELEMENTS[lackingElement(b.counts)]} 기운을 채워 줌`);
  }

  score = Math.max(5, Math.min(99, Math.round(score)));
  return { score, label: labelOf(score), why };
}

export function labelOf(score) {
  if (score >= 80) return { text: '찰떡궁합', emoji: '💞', tone: 'great' };
  if (score >= 65) return { text: '든든한 사이', emoji: '🤝', tone: 'good' };
  if (score >= 50) return { text: '무난한 사이', emoji: '🙂', tone: 'ok' };
  if (score >= 35) return { text: '티격태격', emoji: '⚡', tone: 'bad' };
  return { text: '불꽃 튀는 사이', emoji: '🔥', tone: 'worst' };
}

// 공유 링크용 인코딩 (base64url JSON)
export function encodePerson(p) {
  const json = JSON.stringify({ v: 1, n: p.name, s: p.ds, b: p.db, c: p.counts, f: p.face });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePerson(code) {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const ok =
      o.v === 1 && typeof o.n === 'string' && o.n.length > 0 && o.n.length <= 20 &&
      Number.isInteger(o.s) && o.s >= 0 && o.s < 10 && Number.isInteger(o.b) && o.b >= 0 && o.b < 12 &&
      Array.isArray(o.c) && o.c.length === 5 && o.c.every((n) => Number.isInteger(n) && n >= 0 && n <= 8) &&
      (o.f === null || (Number.isInteger(o.f) && o.f >= 0 && o.f < 5));
    return ok ? { name: o.n, ds: o.s, db: o.b, counts: o.c, face: o.f } : null;
  } catch {
    return null;
  }
}
