// 유료 결과 화면 시안 — 예시 인물(src/sample) 판정 + 예시 해설로 그린다.
import { readFace, yearlyFlow, zoneGrades } from './lib/reading.js';
import { buildBrief, SECTIONS } from './lib/narrative.js';
import { buildFaceChart } from './chart.js';
import { SAMPLE } from './sample/me.js';
import NARRATIVE from './sample/narrative.json';

const opts = { forehead: SAMPLE.forehead, gender: SAMPLE.gender };
const reading = readFace(SAMPLE.metrics, opts);
const yearly = yearlyFlow(SAMPLE.metrics, SAMPLE.birthYear, opts, SAMPLE.thisYear);
const brief = buildBrief(reading, yearly, SAMPLE);
const age = SAMPLE.thisYear - SAMPLE.birthYear + 1;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const G = { good: '길', mid: '평', bad: '흉' };
const chip = (g, text) => `<span class="r-chip ${g}">${esc(text)} <b>${G[g]}</b></span>`;
const paras = (body) => body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

let chartMode = 'palace';
const chart = () =>
  buildFaceChart({
    metrics: SAMPLE.metrics,
    mode: chartMode,
    palaces: reading.palaces,
    zones: zoneGrades(SAMPLE.metrics, opts),
    now: { year: SAMPLE.thisYear, age },
    forehead: SAMPLE.forehead,
  });

function quoteList(spec, quotes) {
  const all = spec.facts.flatMap((f) => f.quotes);
  return quotes
    .map((q) => all.find((x) => x.q === q))
    .filter(Boolean)
    .map((x) => `<li><span class="r-han">${esc(x.q)}</span><span class="r-src">${esc(x.s)}</span><span class="r-tr">${esc(x.t)}</span></li>`)
    .join('');
}

function yearsStrip(spec) {
  return `<ol class="r-years">${spec.years
    .map(
      (y, i) => `<li class="${y.grade}${i === 0 ? ' now' : ''}">
        <span class="r-y">${y.year}${i === 0 ? ' <i>올해</i>' : ''}</span>
        <span class="r-age">${y.age}세</span>
        <span class="r-area">${esc(y.area.replace(/\(.*\)/, ''))}</span>
        <b>${G[y.grade] ?? '—'}</b>
      </li>`,
    )
    .join('')}</ol>`;
}

function section(spec, n, i) {
  const chips = spec.facts.filter((f) => f.grade && !f.id.startsWith('zone:'));
  const uniq = [...new Map(chips.map((f) => [f.id, f])).values()];
  const showChips = spec.key !== 'gomin' && spec.key !== 'hanmadi' && spec.key !== 'majimak';
  const label = SECTIONS.find((s) => s.key === spec.key).label;
  return `<details class="r-sec ${spec.key === 'sseunsori' ? 'harsh' : ''}" id="s-${spec.key}" ${i < 1 ? 'open' : ''}>
    <summary>
      <span class="r-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="r-head">${n.title === label ? "" : `<small>${esc(label)}</small>`}<strong>${esc(n.title)}</strong></span>
    </summary>
    <div class="r-body">
      ${showChips && uniq.length ? `<div class="r-chips">${uniq.map((f) => chip(f.grade, f.part)).join('')}</div>` : ''}
      ${spec.key === 'olhae' ? yearsStrip(spec) : ''}
      ${paras(n.body)}
      ${n.quotes.length ? `<details class="r-quotes"><summary>원문 근거 ${n.quotes.length}</summary><ul>${quoteList(spec, n.quotes)}</ul></details>` : ''}
    </div>
  </details>`;
}

function render() {
  const secs = brief.sections.map((spec) => ({ spec, n: NARRATIVE.sections.find((s) => s.key === spec.key) }));
  const palaceChips = reading.palaces.filter((p) => p.grade !== 'unread' && p.key !== 'sangmo');
  document.querySelector('#app').innerHTML = `
    <p class="r-mock">결과 화면 시안 · 본인 사진 5장 평균 판정 · 해설은 예시(AI 아님)</p>
    <header class="r-top">
      <p class="eyebrow">麻衣相法 · 相理衡眞 정밀 관상</p>
      <h1 class="r-name">${esc(SAMPLE.name)}님의 관상</h1>
      <p class="r-meta">${SAMPLE.birthYear}년생 · 남 · 세는 나이 ${age}세 · 이마 드러냄 ✓</p>
    </header>

    <section class="card r-chart">
      <div class="seg" role="tablist">
        <button data-mode="palace" class="${chartMode === 'palace' ? 'on' : ''}">십이궁</button>
        <button data-mode="yearly" class="${chartMode === 'yearly' ? 'on' : ''}">나이별 운기</button>
      </div>
      <div class="r-svg">${chart().svg}</div>
      <details class="r-table">
        <summary>관상도 자세히 보기</summary>
        <div class="r-chips">${palaceChips.map((p) => chip(p.grade, `${p.name} · ${p.domain}`)).join('')}</div>
      </details>
    </section>

    ${brief.worry ? `<section class="r-worry"><small>내가 적은 고민</small><p>“${esc(brief.worry)}”</p></section>` : ''}

    <nav class="card r-toc">
      <h2>목차</h2>
      <ol>${secs.map(({ spec, n }, i) => `<li><a href="#s-${spec.key}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(n.title)}</a></li>`).join('')}</ol>
    </nav>

    ${secs.map(({ spec, n }, i) => section(spec, n, i)).join('')}

    <section class="card r-note">
      <p class="r-note-from">관상쟁이의 쪽지</p>
      <p>다 읽었다면, 이런 것도 물어볼 수 있어요.</p>
      <ul class="r-follow">${NARRATIVE.followups.map((q) => `<li><button type="button">${esc(q)}<span>질문하기</span></button></li>`).join('')}</ul>
    </section>

    <div class="r-actions">
      <button type="button" class="primary">공유 이미지 저장</button>
      <button type="button">링크 복사</button>
    </div>
    <p class="fine">『增補麻衣相法全編』·『相理衡眞』 권3의 전통 해석을 옮긴 풀이예요. 재미로 읽어 주세요.</p>
  `;
  document.querySelectorAll('.seg button').forEach((b) =>
    b.addEventListener('click', () => {
      chartMode = b.dataset.mode;
      render();
    }),
  );
  document.querySelectorAll('.r-toc a').forEach((a) =>
    a.addEventListener('click', () => {
      document.querySelector(a.getAttribute('href')).open = true;
    }),
  );
}

render();
