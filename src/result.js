// 유료 결과 화면 시안 — 예시 인물(src/sample) 판정 + 예시 해설로 그린다.
import { readFace, yearlyFlow, zoneGrades } from './lib/reading.js';
import { buildBrief, SECTIONS } from './lib/narrative.js';
import { buildHighlight, zoneRegion } from './highlight.js';
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

// 부위 짧은 이름 (그림 이름표)
const SHORT = {
  myung: '미간', jaebaek: '코', hyungje: '눈썹', jeontaek: '눈', namnyeo: '눈 밑', nobok: '턱 끝', cheocheop: '눈꼬리',
  jilaek: '콧대 뿌리', cheoni: '이마 양옆', gwanrok: '이마', bokdeok: '이마·턱', bumo: '이마 위', namak: '이마',
  dongseo: '광대', jungak: '코', bukak: '턱', bosu: '눈썹', gamchal: '눈', simbyeon: '코', chulnap: '입', injung: '인중',
};

let hlId = 0;
function pictureOf(spec) {
  const marks = [];
  const seen = new Set();
  for (const f of spec.facts) {
    if (!f.grade) continue;
    const region = f.id.startsWith('zone:') ? zoneRegion(f.part.split(': ')[1] ?? '') : f.id;
    if (!region || seen.has(region) || region === 'sangmo') continue;
    seen.add(region);
    marks.push({ region, grade: f.grade, label: SHORT[f.id] ?? (f.id.startsWith('zone:') ? f.part.split(' ')[0] : null) });
  }
  if (!marks.length || spec.key === 'gomin') return '';
  // 큰 띠(삼정·상모)를 먼저 깔고 작은 자리를 위에
  marks.sort((a, b) => (['thirds', 'sangmo'].includes(b.region) ? 1 : 0) - (['thirds', 'sangmo'].includes(a.region) ? 1 : 0));
  return `<figure class="r-pic">${buildHighlight(SAMPLE.metrics, marks, { clipId: `hl${hlId++}` }).svg}</figure>`;
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
      ${spec.key === 'olhae' ? yearsStrip(spec) : pictureOf(spec)}
      ${showChips && uniq.length ? `<div class="r-chips">${uniq.map((f) => chip(f.grade, f.part)).join('')}</div>` : ''}
      ${paras(n.body)}
    </div>
  </details>`;
}

// 맨 위 얼굴 지도: 모든 자리를 길흉 색으로, 좋은 자리 넷과 조심할 자리에 이름표
const MAP_KEYS = ['myung', 'jaebaek', 'hyungje', 'jeontaek', 'namnyeo', 'cheocheop', 'jilaek', 'cheoni', 'gwanrok', 'bumo', 'dongseo', 'chulnap', 'injung', 'nobok'];
const MAP_LABEL = { myung: '미간 · 운명', jaebaek: '코 · 재물', hyungje: '눈썹 · 형제', jeontaek: '눈 · 집', namnyeo: '눈 밑 · 자녀', cheocheop: '눈꼬리 · 배우자', jilaek: '콧대 뿌리 · 건강', cheoni: '이마 옆 · 이동', gwanrok: '이마 · 명예', bumo: '이마 위 · 부모', dongseo: '광대 · 권세', chulnap: '입 · 녹봉', injung: '인중 · 수명', nobok: '턱 · 사람' };
function faceMap() {
  const r = reading.results;
  const marks = MAP_KEYS.filter((k) => r[k] && r[k].grade !== 'unread').map((k) => ({ region: k, grade: r[k].grade }));
  const tagged = new Set([...marks.filter((m) => m.grade === 'bad').map((m) => m.region), ...['jaebaek', 'myung', 'nobok', 'chulnap', 'cheoni'].filter((k) => r[k]?.grade === 'good')].slice(0, 6));
  for (const m of marks) if (tagged.has(m.region)) m.label = MAP_LABEL[m.region];
  return buildHighlight(SAMPLE.metrics, marks, { clipId: 'map' }).svg;
}

function render() {
  const secs = brief.sections.map((spec) => ({ spec, n: NARRATIVE.sections.find((s) => s.key === spec.key) }));
  const palaceChips = reading.palaces.filter((p) => p.grade !== 'unread' && p.key !== 'sangmo');
  document.querySelector('#app').innerHTML = `
    <p class="r-mock">시안 · 본인 사진 5장 평균 · 해설은 예시</p>
    <header class="r-top">
      <p class="eyebrow">麻衣相法 · 相理衡眞 정밀 관상</p>
      <h1 class="r-name">${esc(SAMPLE.name)}님의 관상</h1>
      <p class="r-meta">${SAMPLE.birthYear}년생 · 남 · 세는 나이 ${age}세 · 이마 드러냄 ✓</p>
    </header>

    <section class="card r-chart">
      <p class="r-headline">${esc(NARRATIVE.sections[0].title)}</p>
      <div class="r-svg">${faceMap()}</div>
      <p class="r-legend"><span class="good">● 복이 붙은 자리</span><span class="bad">● 조심할 자리</span><span class="mid">● 보통</span></p>
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
  document.querySelectorAll('.r-toc a').forEach((a) =>
    a.addEventListener('click', () => {
      document.querySelector(a.getAttribute('href')).open = true;
    }),
  );
}

render();
