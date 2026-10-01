// 친구 관계도 SVG — 나를 중심에 두고 친구를 원형으로 배치, 모든 쌍을 궁합 점수로 잇는다.
import { compatibility } from './lib/compat.js';
import { josa } from './lib/josa.js';
import { FACE_TYPES } from './lib/physiognomy.js';
import { STEMS, BRANCHES } from './lib/saju.js';

// PNG로 저장할 때도 색이 유지되도록 CSS 변수 대신 고정 색을 쓴다
const TONE_COLOR = { great: '#e0457b', good: '#2f9e6e', ok: '#9a8f80', bad: '#e08a2e', worst: '#d6402b' };
const FONT = 'font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" text-anchor="middle" dominant-baseline="middle"';
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @param {import('./lib/compat.js').Person} me
 * @param {import('./lib/compat.js').Person[]} friends
 */
export function buildGraph(me, friends) {
  const people = [me, ...friends];
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = friends.length <= 1 ? 110 : 130;
  const pos = people.map((_, i) => {
    if (i === 0) return { x: cx, y: cy };
    const a = -Math.PI / 2 + ((i - 1) / friends.length) * Math.PI * 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  const edges = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      edges.push({ i, j, ...compatibility(people[i], people[j]) });
    }
  }

  const lines = edges
    .map((e, k) => {
      const a = pos[e.i];
      const b = pos[e.j];
      const mine = e.i === 0;
      const w = mine ? 2 + Math.abs(e.score - 50) / 12 : 1.2;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return `<g class="edge${mine ? ' mine' : ''}" data-edge="${k}" tabindex="0" role="button" aria-label="${esc(josa(people[e.i].name, '과/와'))} ${esc(people[e.j].name)}: ${e.label.text} ${e.score}점">
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${TONE_COLOR[e.label.tone]}" stroke-width="${w}" ${e.label.tone === 'bad' || e.label.tone === 'worst' ? 'stroke-dasharray="5 4"' : ''}/>
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="transparent" stroke-width="16"/>
        ${mine || people.length <= 4 ? `<text x="${mx}" y="${my}" ${FONT} font-size="15">${e.label.emoji}</text>` : ''}
      </g>`;
    })
    .join('');

  const nodes = people
    .map((p, i) => {
      const { x, y } = pos[i];
      const r = i === 0 ? 34 : 26;
      const face = p.face !== null ? FACE_TYPES[p.face].emoji : '❔';
      return `<g class="node${i === 0 ? ' me' : ''}">
        <circle cx="${x}" cy="${y}" r="${r}" fill="${i === 0 ? '#2b2118' : '#fffaf0'}" stroke="#b8862f" stroke-width="2"/>
        <text x="${x}" y="${y - 3}" ${FONT} font-size="${i === 0 ? 20 : 16}">${face}</text>
        <text x="${x}" y="${y + 14}" ${FONT} font-size="9" fill="${i === 0 ? '#f3e3c3' : '#6b5a45'}">${STEMS[p.ds]}${BRANCHES[p.db]}</text>
        <text x="${x}" y="${y + r + 13}" ${FONT} font-size="13" font-weight="700" fill="#2b2118" paint-order="stroke" stroke="#fffaf0" stroke-width="4">${esc(p.name)}</text>
      </g>`;
    })
    .join('');

  const svg = `<svg viewBox="0 0 ${W} ${H + 16}" xmlns="http://www.w3.org/2000/svg" class="graph-svg" role="img" style="background:#f6efe2;border-radius:16px" aria-label="친구 관계도">${lines}${nodes}</svg>`;
  return { svg, edges, people };
}
