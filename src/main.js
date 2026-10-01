import { computeSaju, ELEMENTS, ELEMENTS_HANJA, ELEMENT_TRAIT, DAY_STEM_TEXT, STEM_ELEMENT, BRANCH_ELEMENT } from './lib/saju.js';
import { computeMetrics, averageMetrics, poseIssue, readFeatures, FACE_TYPES } from './lib/physiognomy.js';
import { kingVerdict } from './lib/king.js';
import { readPalaces, readThirds, summarize, yearlyFlow, GRADE, UNREADABLE_PALACES } from './lib/reading.js';
import { bridgeReading } from './lib/bridge.js';
import { CITIES, ELEMENT_DIRECTION, evaluateLocation, readExifGps } from './lib/location.js';
import { toPerson, encodePerson, decodePerson, compatibility } from './lib/compat.js';
import { josa } from './lib/josa.js';
import { buildGraph } from './graph.js';
import { detect, loadLandmarker } from './face.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 유료 예정 풀이(이 자리·관계도)는 결제가 붙기 전까지 ?all 로만 열어 본다
const SHOW_ALL = new URLSearchParams(location.search).has('all');

// ── 저장소: 기기 안에만 저장 (사진은 저장하지 않음) ──
const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(`gs:${k}`);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`gs:${k}`, JSON.stringify(v));
    } catch {
      /* 저장 불가 환경 — 무시 */
    }
  },
  clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('gs:')).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* 무시 */
    }
  },
};

const state = {
  face: store.get('face'), // { metrics }
  profile: store.get('profile'), // 사주 단계에서만 입력
  birthYear: store.get('birthYear'), // 유년운기용 (선택)
  friends: store.get('friends', []),
  home: store.get('home'),
  photoGps: null,
  verdict: null,
  saju: null,
  invite: null,
  lastPlace: null,
};

const show = (id) => {
  for (const s of ['step-hero', 'step-result']) $(`#${s}`).hidden = s !== id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
const myName = () => state.profile?.name || '나';

// ── 초대 링크 ──
function readInvite() {
  const m = location.hash.match(/f=([\w-]+)/);
  if (!m) return;
  const p = decodePerson(m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  if (!p) return;
  state.invite = p;
  addFriend(p);
  const box = $('#invite');
  box.hidden = false;
  box.innerHTML = `<b>${esc(p.name)}</b>님이 물어봤어요.<br>“너는 왕이 될 상이야?” 👑`;
}

function addFriend(p) {
  state.friends = state.friends.filter((f) => f.name !== p.name).concat(p).slice(-11);
  store.set('friends', state.friends);
}

// ── 1. 동의 + 사진 ──
const syncConsent = () => {
  const ok = $('#agree-age').checked && $('#agree-face').checked;
  $('#btn-camera').disabled = !ok;
  $('#file').disabled = !ok;
  $('#label-file').classList.toggle('disabled', !ok);
  if (ok) {
    store.set('consent', true);
    loadLandmarker().catch(() => {}); // 미리 로딩
  }
};
$('#agree-age').addEventListener('change', syncConsent);
$('#agree-face').addEventListener('change', syncConsent);
if (store.get('consent')) {
  $('#agree-age').checked = true;
  $('#agree-face').checked = true;
  syncConsent();
}

// 태어난 해 (선택) — 유년운기에 쓴다
const THIS_YEAR = new Date().getFullYear();
const yearOptions = Array.from({ length: THIS_YEAR - 14 - 1930 + 1 }, (_, i) => THIS_YEAR - 14 - i)
  .map((y) => `<option value="${y}">${y}년</option>`)
  .join('');
$('#birth-year').insertAdjacentHTML('beforeend', yearOptions);
if (state.birthYear) $('#birth-year').value = String(state.birthYear);
$('#birth-year').addEventListener('change', (e) => setBirthYear(e.target.value));

function setBirthYear(v) {
  state.birthYear = v ? Number(v) : null;
  store.set('birthYear', state.birthYear);
  if (state.face?.metrics && !$('#step-result').hidden) renderYearly();
}

const video = $('#video');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const status = (t) => {
  $('#photo-status').textContent = t;
};
let stream = null;

function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.hidden = true;
  $('#btn-shoot').hidden = true;
}

$('#btn-camera').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 720, height: 960 } });
    video.srcObject = stream;
    await video.play();
    video.hidden = false;
    canvas.hidden = true;
    $('#stage-empty').hidden = true;
    $('#btn-shoot').hidden = false;
    state.photoGps = null;
    status('얼굴을 화면 가운데에 맞추고 찰칵을 눌러 주세요.');
  } catch {
    status('카메라를 열 수 없어요. 사진 올리기를 이용해 주세요.');
  }
});

$('#btn-shoot').addEventListener('click', async () => {
  status('왕기를 재는 중… (1초)');
  const frames = [];
  for (let i = 0; i < 5; i++) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const r = await detect(canvas).catch(() => null);
    if (r) frames.push(r);
    await new Promise((res) => setTimeout(res, 200));
  }
  stopCamera();
  finishAnalysis(frames, canvas.width, canvas.height);
});

$('#file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  stopCamera();
  status('왕기를 재는 중…');
  try {
    state.photoGps = readExifGps(await file.arrayBuffer());
    const img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const r = await detect(canvas);
    finishAnalysis(r ? [r] : [], canvas.width, canvas.height);
  } catch (err) {
    console.error(err);
    status('사진을 분석하지 못했어요. 다른 사진으로 시도해 주세요.');
  }
  e.target.value = '';
});

function finishAnalysis(frames, w, h) {
  canvas.hidden = false;
  $('#stage-empty').hidden = true;
  if (!frames.length) return status('얼굴을 찾지 못했어요. 밝은 곳에서 정면으로 다시 찍어 주세요.');
  if (frames.some((f) => f.faces > 1)) return status('한 사람만 나온 사진으로 해 주세요.');
  const metrics = averageMetrics(frames.map((f) => computeMetrics(f.landmarks, w, h)));
  const expression = {
    smile: Math.min(...frames.map((f) => f.expression.smile)),
    jawOpen: Math.min(...frames.map((f) => f.expression.jawOpen)),
  };
  drawLandmarks(frames.at(-1).landmarks, w, h);
  const issue = poseIssue(metrics, expression);
  if (issue) return status(issue);
  state.face = { metrics };
  store.set('face', state.face);
  status('');
  renderResult();
}

function drawLandmarks(lm, w, h) {
  ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
  for (let i = 0; i < lm.length; i += 3) {
    ctx.beginPath();
    ctx.arc(lm[i].x * w, lm[i].y * h, Math.max(1.2, w / 500), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 2. 관상 결과 ──
const elBadge = (el) => `<span class="el el-${el}">${ELEMENTS[el]}${ELEMENTS_HANJA[el]}</span>`;

const chip = (grade) => `<span class="chip chip-${GRADE[grade].tone}">${GRADE[grade].short}</span>`;

function renderResult() {
  const m = state.face.metrics;
  const v = (state.verdict = kingVerdict(m));
  const ft = FACE_TYPES[v.el];
  const palaces = (state.palaces = readPalaces(m));
  const sum = (state.summary = summarize(palaces));

  $('#summary').innerHTML = `
    <p class="eyebrow">나의 관상 총평</p>
    <h2 class="headline">${sum.headline}</h2>
    <p class="sub">${sum.sub}</p>
    <p class="tags">${sum.tags.map((t) => `<span>${t}</span>`).join('')}</p>
    <p class="face-type">${ft.emoji} <b>${ft.name}</b> · ${ft.shape}<br>${ft.text}</p>
    <ul class="palace-grid" aria-label="십이궁 한눈에 보기">
      ${palaces.map((p) => `<li><a href="#palace-${p.key}"><span>${p.name}</span><small>${p.domain}</small>${chip(p.grade)}</a></li>`).join('')}
    </ul>`;

  renderYearly();

  $('#palaces').innerHTML = `
    <h2>십이궁(十二宮) 풀이</h2>
    <p class="hint">얼굴의 열두 자리가 각각 인생의 한 분야를 맡는다고 보는 관상의 기본 틀이에요.</p>
    ${palaces
      .map(
        (p) => `<article class="palace" id="palace-${p.key}">
          <header><h3>${p.name} <small>${p.hanja}</small></h3>${chip(p.grade)}</header>
          <p class="palace-area">${p.area} · ${p.domain}</p>
          <p>${p.text}</p>
          ${p.tip ? `<p class="tip">개운법 · ${p.tip}</p>` : ''}
        </article>`,
      )
      .join('')}
    <p class="fine">${UNREADABLE_PALACES}</p>`;

  const thirds = readThirds(m);
  $('#features').innerHTML = `
    <h2>삼정(三停)과 오관(五官)</h2>
    <ol class="thirds">${thirds.map((t) => `<li><b>${t.name}</b><small>${t.ages}</small><span>${t.area}</span>${chip(t.grade)}</li>`).join('')}</ol>
    <dl class="reading">${readFeatures(m).map((r) => `<dt>${r.part}</dt><dd>${r.text}</dd>`).join('')}</dl>
    <p class="fine">귀(채청관)는 사진에서 잘 보이지 않아 풀이에서 뺐어요. 풀이는 전통 관상 이론을 얼굴 비율 측정에 맞춰 옮긴 것이고, 과학적 예측이 아니에요.</p>`;

  $('#verdict').innerHTML = `
    <p class="eyebrow">덤 · 내가 왕이 될 상인가?</p>
    <p class="answer">${v.answer}</p>
    <div class="rank${v.isKing ? ' king' : ''}">
      <span class="rank-hanja" aria-hidden="true">${v.hanja}</span>
      <h2 class="rank-title">${v.title}의 상</h2>
    </div>
    <div class="meter" role="img" aria-label="왕기 지수 ${v.score}점 (100점 만점, 85점 이상 왕)">
      <div class="meter-bar"><i style="--w:${v.score}%"></i><b class="meter-king" title="왕"></b></div>
      <p><span>왕기(王氣) 지수</span><strong>${v.score}</strong></p>
    </div>
    <p>${v.text}</p>`;

  show('step-result');
  if (state.profile) renderSaju();
  else {
    $('#saju-unlock').hidden = false;
    $('#saju').hidden = true;
    for (const id of ['premium', 'place', 'friends']) $(`#${id}`).hidden = true;
  }
}

function renderYearly() {
  const box = $('#yearly');
  if (!state.birthYear) {
    box.innerHTML = `
      <p class="eyebrow">유년운기(流年運氣)</p>
      <h2>올해 내 얼굴의 어느 자리가 운을 맡고 있을까?</h2>
      <p>관상에서는 나이마다 운을 맡는 얼굴 자리가 정해져 있어요. 태어난 해를 고르면 올해와 앞으로 4년의 운을 읽어 드려요.</p>
      <label>태어난 해 <select id="yearly-birth"><option value="">선택</option>${yearOptions}</select></label>`;
    $('#yearly-birth').addEventListener('change', (e) => {
      $('#birth-year').value = e.target.value;
      setBirthYear(e.target.value);
    });
    return;
  }
  const flow = (state.flow = yearlyFlow(state.face.metrics, state.birthYear));
  const now = flow[0];
  box.innerHTML = `
    <p class="eyebrow">유년운기 · ${now.year}년 · ${now.age}세(세는 나이)</p>
    ${
      now.area
        ? `<h2>올해는 <em>${now.area}</em>의 해</h2>
           <p class="yearly-theme">${now.range}는 이 자리가 <b>${josa(now.theme, '을/를')}</b> 맡아요. ${chip(now.grade)}</p>
           <p>${now.text}</p>`
        : `<p>${now.text}</p>`
    }
    <ol class="flow">${flow
      .map(
        (f) => `<li class="flow-${GRADE[f.grade].tone}"><b>${f.year}</b><small>${f.age}세</small><span>${f.area ? f.area.replace(/\(.*\)/, '') : '—'}</span>${chip(f.grade)}</li>`,
      )
      .join('')}</ol>
    ${flow
      .slice(1)
      .filter((f, i) => f.area && f.area !== flow[i].area)
      .map((f) => `<p class="next"><b>${f.year}년부터 ${f.area}</b> — ${f.text}</p>`)
      .join('')}
    <button class="link" id="btn-change-year">태어난 해 바꾸기</button>`;
  $('#btn-change-year').addEventListener('click', () => {
    $('#birth-year').value = '';
    setBirthYear('');
  });
}

// ── 3. 무료 1회 더: 관상 × 사주 ──
$('#pf-city').innerHTML = CITIES.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
const pf = $('#profile-form');
$('#pf-notime').addEventListener('change', () => {
  $('#pf-time').disabled = $('#pf-notime').checked;
});
pf.addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = {
    name: $('#pf-name').value.trim(),
    birth: $('#pf-birth').value,
    time: $('#pf-notime').checked || !$('#pf-time').value ? null : $('#pf-time').value,
    city: Number($('#pf-city').value),
  };
  store.set('profile', state.profile);
  renderSaju();
  $('#saju').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function sajuOf({ birth, time, city = 0 }) {
  const [year, month, day] = birth.split('-').map(Number);
  const [hour, minute] = time ? time.split(':').map(Number) : [null, 0];
  return computeSaju({ year, month, day, hour, minute, longitude: CITIES[city].lon });
}

function renderSaju() {
  const saju = (state.saju = sajuOf(state.profile));
  const faceEl = state.verdict.el;
  const bridge = bridgeReading(faceEl, saju);
  const p = saju.pillars;
  const cols = [['시', p.hour], ['일', p.day], ['월', p.month], ['년', p.year]];
  const max = Math.max(...saju.counts);
  const ds = DAY_STEM_TEXT[p.day.stem];
  $('#saju-unlock').hidden = true;
  const box = $('#saju');
  box.hidden = false;
  box.innerHTML = `
    <p class="eyebrow">관상 × 사주 · ${saju.animal}띠</p>
    <h2>${bridge.title}</h2>
    <p>${bridge.text}</p>
    ${bridge.notes.map((n) => `<p class="note">✨ ${n}</p>`).join('')}
    <div class="table-wrap"><table class="pillars"><tr>${cols.map(([k]) => `<th>${k}주</th>`).join('')}</tr>
      <tr>${cols.map(([, c]) => `<td>${c ? `<span class="el-${STEM_ELEMENT[c.stem]}">${c.hanja[0]}</span><small>${c.name[0]}</small>` : '?'}</td>`).join('')}</tr>
      <tr>${cols.map(([, c]) => `<td>${c ? `<span class="el-${BRANCH_ELEMENT[c.branch]}">${c.hanja[1]}</span><small>${c.name[1]}</small>` : '?'}</td>`).join('')}</tr>
    </table></div>
    ${saju.hasTime ? '' : '<p class="hint">태어난 시간을 모르면 시주를 빼고 6글자로 풀어요.</p>'}
    <h3>일간 ${elBadge(saju.dayElement)} — ${ds.title}</h3>
    <p>${ds.text}</p>
    <h3>오행 분포 <small class="hint">${saju.strength}</small></h3>
    <div class="bars">${saju.counts
      .map((c, i) => `<div class="bar"><span>${ELEMENTS[i]}</span><i style="--w:${max ? (c / max) * 100 : 0}%" class="bg-${i}"></i><b>${c}</b></div>`)
      .join('')}</div>
    <p>부족한 기운은 ${elBadge(saju.lacking)} (${ELEMENT_TRAIT[saju.lacking]}).
      ${ELEMENT_DIRECTION[saju.lacking]}쪽 방향, ${['초록', '빨강', '노랑·베이지', '흰색·은색', '검정·남색'][saju.lacking]} 계열이 운을 보완해요.</p>
    <p class="fine">절기는 태양 황경으로 계산하고, 시간은 출생지 경도로 보정해요(균시차 미반영). 신강·신약과 부족 오행은 단순화한 계산이에요.</p>
    <button class="link" id="btn-edit-profile">생년월일 다시 입력</button>`;
  $('#btn-edit-profile').addEventListener('click', () => {
    $('#pf-name').value = state.profile.name;
    $('#pf-birth').value = state.profile.birth;
    $('#pf-time').value = state.profile.time ?? '';
    $('#pf-notime').checked = !state.profile.time;
    $('#pf-time').disabled = !state.profile.time;
    $('#pf-city').value = String(state.profile.city);
    $('#saju-unlock').hidden = false;
    $('#saju-unlock').scrollIntoView({ behavior: 'smooth' });
  });

  $('#premium').hidden = SHOW_ALL;
  $('#place').hidden = !SHOW_ALL;
  $('#friends').hidden = !SHOW_ALL;
  if (SHOW_ALL) {
    renderOrigins();
    $('#place-result').innerHTML = '';
    $('#place-status').textContent = state.photoGps ? '올린 사진에 촬영 위치가 있어요.' : '';
    renderPhotoPlaceButton();
    renderGraph();
  }
}

// ── 공유 · 저장 ──
const shareStatus = (t) => {
  $('#share-status').textContent = t;
};

function shareUrl() {
  const base = `${location.origin}${location.pathname}`;
  return state.saju ? `${base}#f=${encodePerson(me())}` : base;
}

async function shareLink(text) {
  const url = shareUrl();
  try {
    if (navigator.share) {
      await navigator.share({ title: '내가 왕이 될 상인가?', text, url });
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    shareStatus('링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.');
  } catch {
    shareStatus(`이 링크를 복사해 보내 주세요: ${url}`);
  }
}

$('#btn-share').addEventListener('click', () => {
  const sum = state.summary;
  const year = state.flow?.[0]?.area ? ` 올해는 ${state.flow[0].area.replace(/\(.*\)/, '')}의 해래.` : '';
  shareLink(`내 관상은 '${sum.headline}' ${sum.tags.join(' ')}${year} 너도 봐 봐 👀`);
});

$('#btn-card').addEventListener('click', async () => {
  const sum = state.summary;
  const ft = FACE_TYPES[state.verdict.el];
  const now = state.flow?.[0];
  await Promise.all(['900 80px', '700 44px', '400 34px'].map((f) => document.fonts.load(`${f} "Noto Serif KR"`, sum.headline))).catch(() => {});
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d');
  const font = (w, size) => `${w} ${size}px "Noto Serif KR", "Nanum Myeongjo", serif`;
  const sans = (w, size) => `${w} ${size}px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  g.fillStyle = '#1d1712';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 4;
  g.strokeRect(48, 48, 984, 1254);
  g.strokeRect(64, 64, 952, 1222);
  g.textAlign = 'center';
  g.fillStyle = '#c9a24a';
  g.font = sans(600, 34);
  g.fillText(state.profile?.name ? `${state.profile.name}님의 관상` : '나의 관상 총평', 540, 160);
  g.fillStyle = '#f3e3c3';
  g.font = font(900, 76);
  let y = wrap(g, sum.headline, 540, 280, 860, 96);
  g.font = sans(400, 36);
  g.fillStyle = '#bfae95';
  y = wrap(g, sum.sub, 540, y + 70, 860, 50);
  g.fillStyle = '#c9a24a';
  g.font = sans(700, 38);
  g.fillText(sum.tags.join('  '), 540, y + 80);
  // 십이궁 등급
  const ps = state.palaces;
  const colW = 860 / 5;
  ps.forEach((p, i) => {
    const x = 110 + colW * (i % 5) + colW / 2;
    const yy = y + 180 + Math.floor(i / 5) * 110;
    g.fillStyle = '#f3e3c3';
    g.font = sans(600, 30);
    g.fillText(p.name, x, yy);
    g.fillStyle = p.grade === 'good' ? '#e8c060' : p.grade === 'bad' ? '#e0846f' : '#8c7b64';
    g.font = sans(700, 28);
    g.fillText(GRADE[p.grade].short, x, yy + 44);
  });
  y += 180 + 220;
  if (now?.area) {
    g.fillStyle = '#f3e3c3';
    g.font = font(700, 42);
    g.fillText(`${now.year}년, ${now.area.replace(/\(.*\)/, '')}의 해 · ${GRADE[now.grade].short}`, 540, y + 20);
    g.font = sans(400, 32);
    g.fillStyle = '#bfae95';
    wrap(g, now.text, 540, y + 80, 860, 46);
  }
  g.fillStyle = '#bfae95';
  g.font = sans(400, 32);
  g.fillText(`${ft.emoji} ${ft.name}`, 540, 1200);
  g.fillStyle = '#8c7b64';
  g.font = sans(400, 26);
  g.fillText('내가 왕이 될 상인가? · 재미로 보는 관상', 540, 1252);
  await saveCanvas(c, '나의관상.png');
});

function wrap(g, text, x, y, maxW, lh) {
  let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW) {
      g.fillText(line, x, y);
      line = ch;
      y += lh;
    } else line += ch;
  }
  g.fillText(line, x, y);
  return y;
}

async function saveCanvas(c, filename) {
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '내가 왕이 될 상인가?' });
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── 유료 예정: 이 자리 ──
function origins() {
  const city = CITIES[state.profile.city];
  const list = [{ ...city, name: `출생지(${city.name})` }];
  if (state.home) list.push({ ...state.home, name: '집' });
  return list;
}
function renderOrigins() {
  $('#origin').innerHTML = origins().map((o, i) => `<option value="${i}">${o.name}</option>`).join('');
}
function renderPhotoPlaceButton() {
  document.querySelector('#btn-photo-place')?.remove();
  if (!state.photoGps) return;
  const b = document.createElement('button');
  b.id = 'btn-photo-place';
  b.textContent = '사진 찍은 곳으로 보기';
  b.addEventListener('click', () => renderPlace(state.photoGps, '사진 찍은 곳'));
  $('#btn-locate').after(b);
}

function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

$('#btn-locate').addEventListener('click', async () => {
  $('#place-status').textContent = '위치 확인 중…';
  try {
    renderPlace(await locate(), '지금 있는 곳');
  } catch {
    $('#place-status').textContent = '위치를 가져올 수 없어요. 브라우저 위치 권한을 확인해 주세요.';
  }
});

$('#btn-home').addEventListener('click', async () => {
  try {
    state.home = await locate();
    store.set('home', state.home);
    renderOrigins();
    $('#origin').value = '1';
    $('#place-status').textContent = "지금 위치를 '집'으로 저장했어요(이 기기에만).";
  } catch {
    $('#place-status').textContent = '위치를 가져올 수 없어요.';
  }
});

function renderPlace(here, label) {
  const origin = origins()[Number($('#origin').value) || 0];
  const r = evaluateLocation({ origin, here, saju: state.saju, faceEl: state.verdict.el });
  $('#place-status').textContent = '';
  $('#place-result').innerHTML = `
    <div class="verdict v-${r.verdict.label}">
      <span class="v-emoji">${r.verdict.emoji}</span>
      <div><b>${r.verdict.label}</b><p>${r.verdict.text}</p></div>
    </div>
    <p>${josa(label, '은/는')} ${esc(origin.name)}에서 <b>${r.direction.name}쪽</b> ${r.km < 2 ? '' : `${r.km.toFixed(r.km < 10 ? 1 : 0)}km`} — ${r.direction.gua}, ${elBadge(r.element)} 기운의 자리예요.</p>
    <ul class="reasons">${r.reasons.map(([s, t]) => `<li class="${s === '+' ? 'plus' : 'minus'}">${t}</li>`).join('') || '<li>특별히 부딪히거나 돕는 기운이 없어요.</li>'}</ul>
    <p class="note">🧭 ${r.tip}</p>
    <p class="fine">오늘 일진에 따라 결과가 매일 달라져요. 위치는 전송되지 않아요.</p>`;
  state.lastPlace = r;
}

// ── 유료 예정: 관계도 ──
function me() {
  return toPerson(myName(), state.saju, state.verdict.el);
}

function renderGraph() {
  const { svg, edges, people } = buildGraph(me(), state.friends);
  $('#graph').innerHTML = state.friends.length ? svg : '<p class="empty">아직 친구가 없어요. 초대 링크를 보내 보세요!</p>';
  const detail = $('#edge-detail');
  detail.textContent = state.friends.length ? '선을 누르면 두 사람의 궁합이 보여요.' : '';
  $('#graph').querySelectorAll('[data-edge]').forEach((g) => {
    const onPick = () => {
      const e = edges[Number(g.dataset.edge)];
      detail.innerHTML = `<b>${esc(people[e.i].name)} × ${esc(people[e.j].name)}</b> — ${e.label.emoji} ${e.label.text} <b>${e.score}점</b><br>${e.why.map(esc).join('<br>')}`;
    };
    g.addEventListener('click', onPick);
    g.addEventListener('keydown', (ev) => (ev.key === 'Enter' || ev.key === ' ') && onPick());
  });
  $('#friend-list').innerHTML = state.friends.length
    ? `<ul class="friends">${state.friends
        .map((f, i) => {
          const c = compatibility(me(), f);
          return `<li><span>${esc(f.name)} ${f.face !== null ? FACE_TYPES[f.face].emoji : ''}</span><span>${c.label.emoji} ${c.label.text} ${c.score}</span><button class="ghost small" data-del="${i}" aria-label="${esc(f.name)} 삭제">✕</button></li>`;
        })
        .join('')}</ul>`
    : '';
  $('#friend-list').querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => {
      state.friends.splice(Number(b.dataset.del), 1);
      store.set('friends', state.friends);
      renderGraph();
    }),
  );
}

$('#friend-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const s = sajuOf({ birth: $('#ff-birth').value, time: $('#ff-time').value || null });
  addFriend(toPerson($('#ff-name').value.trim(), s, null));
  e.target.reset();
  renderGraph();
});

$('#btn-invite').addEventListener('click', () => shareLink(`${myName()}의 관상·사주 — 나랑 궁합 볼래? 👀`));

$('#btn-graph-png').addEventListener('click', async () => {
  if (!state.friends.length) return;
  const { svg } = buildGraph(me(), state.friends);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1128;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  await saveCanvas(c, '관계도.png');
});

// ── 다시 찍기 · 기록 지우기 ──
$('#btn-retry').addEventListener('click', () => {
  canvas.hidden = true;
  $('#stage-empty').hidden = false;
  status('');
  show('step-hero');
});
$('#btn-reset').addEventListener('click', () => {
  $('#reset-confirm').hidden = false;
});
$('#btn-reset-no').addEventListener('click', () => {
  $('#reset-confirm').hidden = true;
});
$('#btn-reset-yes').addEventListener('click', () => {
  store.clear();
  location.reload();
});

// ── 시작 ──
readInvite();
if (state.face?.metrics) renderResult();
