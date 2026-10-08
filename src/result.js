// 유료 결과 화면
//  · result.html?order=…&token=…  실제 주문: 서버에서 해설을 받아 오고, 그림은 이 기기에 남은 측정값으로 그린다
//  · result.html?demo=1           결제 없이 내 측정값으로(해설 칸은 비어 있음)
//  · result.html                  시안: 예시 인물 + 예시 해설
import { SECTIONS } from './lib/narrative.js';
import { buildHighlight, zoneRegion } from './highlight.js';
import { imgOf } from './lib/forms.js';
import { prepare } from './lib/prepare.js';
import { joseonScene } from './joseon-art.js';
import { GROUP_NAME } from './lib/joseon.js';
import { getResult } from './paid.js';
import { localNarrative } from './lib/localNarrative.js';
import { SAMPLE } from './sample/me.js';
import SAMPLE_NARRATIVE from './sample/narrative.json';

let P; // 사람
let X; // prepare() 결과
let NARRATIVE;
let MODE;

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
    const FORM_REGION = { brow: 'hyungje', eye: 'jeontaek', nose: 'jaebaek', mouth: 'chulnap' };
    if (f.id === 'cx:note') continue;
    const CX_REGION = { myung: 'myung', gwanrok: 'gwanrok', bumo: 'bumo', jilaek: 'jilaek', yeonsu: 'jilaek', jaebaek: 'jaebaek', cheocheop: 'cheocheop' };
    if (f.id.startsWith('cx:')) { const r = CX_REGION[f.id.split(':')[1]]; if (!seen.has(r)) { seen.add(r); marks.push({ region: r, grade: f.grade, label: f.part.replace('기색 · ', '') }); } continue; }
    const region = f.id.startsWith('zone:') ? zoneRegion(f.part.split(': ')[1] ?? '') : f.id.startsWith('form:') ? FORM_REGION[f.id.split(':')[1]] : f.id;
    if (!region || seen.has(region) || region === 'sangmo') continue;
    seen.add(region);
    marks.push({ region, grade: f.grade, label: SHORT[f.id] ?? (f.id.startsWith('zone:') ? f.part.split(' ')[0] : null) });
  }
  if (!marks.length || spec.key === 'gomin') return '';
  // 큰 띠(삼정·상모)를 먼저 깔고 작은 자리를 위에
  marks.sort((a, b) => (['thirds', 'sangmo'].includes(b.region) ? 1 : 0) - (['thirds', 'sangmo'].includes(a.region) ? 1 : 0));
  return `<figure class="r-pic">${buildHighlight(P.metrics, marks, { clipId: `hl${hlId++}` }).svg}</figure>`;
}

function section(spec, n, i) {
  const label0 = SECTIONS.find((s) => s.key === spec.key).label;
  n = n ?? { title: label0, body: MODE === 'demo' ? '이 칸의 해설은 결제 후 AI가 써요.' : '해설을 쓰는 중이에요…' };
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
      ${spec.key === 'olhae' ? yearsStrip(spec) : P.metrics ? pictureOf(spec) : ''}
      ${showChips && uniq.length ? `<div class="r-chips">${uniq.map((f) => chip(f.grade, f.part)).join('')}</div>` : ''}
      ${paras(n.body)}
    </div>
  </details>`;
}

// 맨 위 얼굴 지도: 모든 자리를 길흉 색으로, 좋은 자리 넷과 조심할 자리에 이름표
const MAP_KEYS = ['myung', 'jaebaek', 'hyungje', 'jeontaek', 'namnyeo', 'cheocheop', 'jilaek', 'cheoni', 'gwanrok', 'bumo', 'dongseo', 'chulnap', 'injung', 'nobok'];
const MAP_LABEL = { myung: '미간 · 운명', jaebaek: '코 · 재물', hyungje: '눈썹 · 형제', jeontaek: '눈 · 집', namnyeo: '눈 밑 · 자녀', cheocheop: '눈꼬리 · 배우자', jilaek: '콧대 뿌리 · 건강', cheoni: '이마 옆 · 이동', gwanrok: '이마 · 명예', bumo: '이마 위 · 부모', dongseo: '광대 · 권세', chulnap: '입 · 녹봉', injung: '인중 · 수명', nobok: '턱 · 사람' };
function faceMap() {
  const r = X.reading.results;
  const marks = MAP_KEYS.filter((k) => r[k] && r[k].grade !== 'unread').map((k) => ({ region: k, grade: r[k].grade }));
  const tagged = new Set([...marks.filter((m) => m.grade === 'bad').map((m) => m.region), ...['jaebaek', 'myung', 'nobok', 'chulnap', 'cheoni'].filter((k) => r[k]?.grade === 'good')].slice(0, 6));
  for (const m of marks) if (tagged.has(m.region)) m.label = MAP_LABEL[m.region];
  return buildHighlight(P.metrics, marks, { clipId: 'map' }).svg;
}

// 조선시대의 나: 그림 → 그때의 삶 → 오늘로 옮기면
function joseonCard(j, name) {
  const s = j.saju;
  const pillars = s ? ['year', 'month', 'day', 'hour'].map((k) => s.saju.pillars[k]?.hanja).filter(Boolean).join(' ') : '';
  const THEN_NOW = [
    ['신분', '태어난 집안이 평생을 정했다', '하는 일과 실력이 자리를 정한다'],
    ['일', j.then, j.now[0]],
    ['기질', '그 자리에 맞춰 살아야 했다', j.now[1]],
    ['길', '한 번 정해지면 바꾸기 어려웠다', j.now[2]],
  ];
  return `<section class="card r-joseon">
    <p class="r-eye-kicker">조선시대였다면 ${esc(name)}${name === '나' ? '는' : '은'}</p>
    <h2 class="r-eye-name">${esc(j.title)}<span>${esc(j.name)}</span></h2>
    <figure class="r-joseon-pic">${joseonScene(j, P.metrics, P.gender)}</figure>
    <p class="r-joseon-why">${pillars ? `사주 <b>${pillars}</b> · ` : ''}${esc(j.why.join(' · '))}</p>
    <h3>오늘로 옮기면</h3>
    <p class="hint">조선과 지금은 사회가 다르니, 같은 기질도 오늘의 조건으로 바꿔 읽어야 해요.</p>
    <ol class="r-thennow">${THEN_NOW.map(([k, a, b]) => `<li><small>${k}</small><span class="then">그때 · ${esc(a)}</span><span class="now">지금 · ${esc(b)}</span></li>`).join('')}</ol>
    ${s ? '' : '<p class="fine">생년월일을 넣으면 사주까지 함께 봐요. 지금은 관상만으로 골랐어요.</p>'}
    <p class="fine">원전에 없는 재미 해석이에요. 사주의 ${Object.entries(s?.groups ?? {}).map(([k, n]) => `${GROUP_NAME[k].slice(0, 2)} ${n}`).join(' · ') || '십성'}과 관상의 자리를 엮어 골랐어요.</p>
  </section>`;
}

function render() {
  const { brief, reading, forms, lead } = X;
  const age = P.birthYear ? P.thisYear - P.birthYear + 1 : null;
  const name = P.name ? `${P.name}님` : '나';
  const secs = brief.sections.map((spec) => ({ spec, n: NARRATIVE?.sections?.find((s) => s.key === spec.key) }));
  const palaceChips = (reading?.palaces ?? []).filter((p) => p.grade !== 'unread' && p.key !== 'sangmo');
  document.querySelector('#app').innerHTML = `
    ${MODE === 'sample' ? '<p class="r-mock">시안 · 예시 인물 · 해설은 예시</p>' : MODE === 'demo' ? '<p class="r-mock">테스트 · 서버 연결 전이라 AI 대신 원문 풀이로 채웠어요</p>' : ''}
    <header class="r-top">
      <p class="eyebrow">麻衣相法 · 相理衡眞 정밀 관상</p>
      <h1 class="r-name">${esc(name)}의 관상</h1>
      <p class="r-meta">${[P.birthYear ? `${P.birthYear}년생` : '', P.gender === 'm' ? '남' : P.gender === 'f' ? '여' : '', age ? `세는 나이 ${age}세` : '', P.forehead?.status === 'visible' ? '이마 드러냄 ✓' : '', P.metrics && Number.isFinite(P.metrics.scanNoseHeight) ? '고개 돌리기 스캔 ✓' : P.metrics ? '정면만 봄' : ''].filter(Boolean).join(' · ')}</p>
    </header>

    ${X.joseon ? joseonCard(X.joseon, name) : ''}

    ${P.metrics ? `<section class="card r-eye">
      <p class="r-eye-kicker">${esc(name)}의 대표 부위는 <b>${esc(lead.organName)}</b></p>
      <h2 class="r-eye-name">${esc(lead.name)}<span>${lead.hanja}</span></h2>
      <p class="r-eye-tag">${lead.tag} · ${esc(lead.shapeKo)}</p>
      <figure class="r-eye-pic">
        <img src="${imgOf(lead)}" alt="『마의상법』의 ${esc(lead.name)} 그림" />
        <figcaption>『마의상법』 원전 그림 · ${lead.hanja}</figcaption>
      </figure>
      <p class="r-eye-reading">${esc(lead.reading)}</p>
      <p class="r-eye-second">한 관만 이루어져도 십 년을 귀하게 드러난다 — 『마의상법』</p>
    </section>

    <section class="r-forms">
      <h2>나의 오관</h2>
      <div class="r-forms-grid">
        ${forms.all.map((f) => `<article class="r-form${f.organ === forms.lead.organ ? ' lead' : ''}">
          <img src="${imgOf(f.best)}" alt="" />
          <small>${esc(f.name)}</small>
          <strong>${esc(f.best.name)}</strong>
          <span>${f.best.hanja} · ${f.best.tag}</span>
        </article>`).join('')}
        <article class="r-form pending"><small>귀</small><strong>고개 돌리기 스캔에서</strong><span>採聽官</span></article>
      </div>
    </section>`
      : ''}

    ${P.metrics ? `<section class="card r-chart">
      <p class="r-headline">${esc(NARRATIVE?.sections?.[0]?.title ?? '')}</p>
      <div class="r-svg">${faceMap()}</div>
      <p class="r-legend"><span class="good">● 복이 붙은 자리</span><span class="bad">● 조심할 자리</span><span class="mid">● 보통</span></p>
      <details class="r-table">
        <summary>관상도 자세히 보기</summary>
        <div class="r-chips">${palaceChips.map((p) => chip(p.grade, `${p.name} · ${p.domain}`)).join('')}</div>
      </details>
    </section>` : ''}

    ${brief.worry ? `<section class="r-worry"><small>내가 적은 고민</small><p>“${esc(brief.worry)}”</p></section>` : ''}

    <nav class="card r-toc">
      <h2>목차</h2>
      <ol>${secs.map(({ spec, n }, i) => `<li><a href="#s-${spec.key}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(n?.title ?? SECTIONS.find((x) => x.key === spec.key).label)}</a></li>`).join('')}</ol>
    </nav>

    ${secs.map(({ spec, n }, i) => section(spec, n, i)).join('')}

    ${NARRATIVE?.followups ? `<section class="card r-note">
      <p class="r-note-from">관상쟁이의 쪽지</p>
      <p>다 읽었다면, 이런 것도 물어볼 수 있어요.</p>
      <ul class="r-follow">${NARRATIVE.followups.map((q) => `<li><button type="button">${esc(q)}<span>질문하기</span></button></li>`).join('')}</ul>
    </section>` : ''}

    <div class="r-actions">
      <button type="button" class="primary" id="btn-copy">결과 링크 복사</button>
    </div>
    <p class="fine">『增補麻衣相法全編』·『相理衡眞』 권3의 전통 해석을 옮긴 풀이예요. 재미로 읽어 주세요.</p>
  `;
  document.querySelectorAll('.r-toc a').forEach((a) =>
    a.addEventListener('click', () => {
      document.querySelector(a.getAttribute('href')).open = true;
    }),
  );
  document.querySelector('#btn-copy')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(location.href).catch(() => {});
    document.querySelector('#btn-copy').textContent = '복사했어요 · 이 링크로 언제든 다시 봐요';
  });
}

const status = (t) => (document.querySelector('#app').innerHTML = `<div class="card r-wait"><p>${t}</p></div>`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const q = new URLSearchParams(location.search);
  const order = q.get('order');
  const token = q.get('token');
  if (order && token) {
    MODE = 'paid';
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(`gs:order:${order}`) || 'null');
    } catch {}
    status('관상을 풀어 쓰는 중이에요… 1~2분 걸려요.<br><small>이마부터 턱까지, 원전을 한 줄씩 대 보는 중</small>');
    for (let i = 0; ; i++) {
      const r = await getResult(order, token).catch(() => ({ status: 'error' }));
      if (r.status === 'done') {
        NARRATIVE = r.narrative;
        if (local) {
          P = local;
          X = prepare(local);
        } else {
          // 다른 기기: 측정값이 없으니 해설만 (그림 없이)
          P = { name: r.brief.person?.name, birthYear: r.brief.person?.birthYear, gender: r.brief.person?.gender === '남' ? 'm' : r.brief.person?.gender === '여' ? 'f' : null, thisYear: r.brief.person?.thisYear, metrics: null };
          X = { brief: r.brief, reading: null, forms: { all: [] }, lead: null };
        }
        return render();
      }
      if (r.status === 'failed') return status('해설을 만들지 못했어요. 결제는 자동으로 취소 요청돼요. 문의: 결과 링크를 보내 주세요.');
      if (r.error === 'order') return status('주문을 찾지 못했어요. 링크를 다시 확인해 주세요.');
      if (i > 90) return status('생각보다 오래 걸려요. 이 링크를 저장해 두고 잠시 뒤 다시 열어 주세요.');
      await sleep(4000);
    }
  }
  if (q.get('demo')) {
    MODE = 'demo';
    try {
      P = JSON.parse(localStorage.getItem('gs:demo') || 'null');
    } catch {}
    if (!P) return status('먼저 첫 화면에서 사진을 찍어 주세요. <a href="./">처음으로</a>');
    X = prepare(P);
    NARRATIVE = localNarrative(X.brief, Object.fromEntries(SECTIONS.map((s) => [s.key, s.label])));
    return render();
  }
  MODE = 'sample';
  P = SAMPLE;
  X = prepare(SAMPLE);
  NARRATIVE = SAMPLE_NARRATIVE;
  render();
}

main();
