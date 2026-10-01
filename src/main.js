import { computeSaju, ELEMENTS, ELEMENTS_HANJA, ELEMENT_TRAIT, DAY_STEM_TEXT, STEM_ELEMENT, BRANCH_ELEMENT } from './lib/saju.js';
import { computeMetrics, averageMetrics, poseIssue, faceElement, readFeatures, FACE_TYPES } from './lib/physiognomy.js';
import { bridgeReading } from './lib/bridge.js';
import { CITIES, ELEMENT_DIRECTION, evaluateLocation, readExifGps } from './lib/location.js';
import { toPerson, encodePerson, decodePerson, compatibility } from './lib/compat.js';
import { josa } from './lib/josa.js';
import { buildGraph } from './graph.js';
import { detect, loadLandmarker } from './face.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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
  profile: store.get('profile'),
  face: store.get('face'), // { el, metrics }
  friends: store.get('friends', []),
  home: store.get('home'),
  photoGps: null,
  saju: null,
  invite: null,
};

const show = (id) => {
  for (const s of ['step-consent', 'step-profile', 'step-photo', 'step-result']) $(`#${s}`).hidden = s !== id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ── 초대 링크 ──
function readInvite() {
  const m = location.hash.match(/f=([\w-]+)/);
  if (!m) return;
  const p = decodePerson(m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  if (!p) return;
  state.invite = p;
  const box = $('#invite');
  box.hidden = false;
  box.innerHTML = `<b>${esc(p.name)}</b>님이 관계도에 초대했어요 💌<br><span class="hint">내 얼굴로 풀어보면 ${esc(p.name)}님과의 궁합이 관계도에 그려져요.</span>`;
  addFriend(p);
}

function addFriend(p) {
  state.friends = state.friends.filter((f) => f.name !== p.name).concat(p).slice(-11);
  store.set('friends', state.friends);
}

// ── 1. 동의 ──
const syncConsent = () => {
  $('#btn-start').disabled = !($('#agree-age').checked && $('#agree-face').checked);
};
$('#agree-age').addEventListener('change', syncConsent);
$('#agree-face').addEventListener('change', syncConsent);
$('#btn-start').addEventListener('click', () => {
  store.set('consent', true);
  show('step-profile');
  loadLandmarker().catch(() => {}); // 미리 로딩
});

// ── 2. 정보 입력 ──
const citySelect = $('#profile-form select[name=city]');
citySelect.innerHTML = CITIES.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
const pf = $('#profile-form');
pf.noTime.addEventListener('change', () => {
  pf.time.disabled = pf.noTime.checked;
});
if (state.profile) {
  pf.name.value = state.profile.name;
  pf.birth.value = state.profile.birth;
  pf.time.value = state.profile.time ?? '';
  pf.noTime.checked = !state.profile.time;
  pf.city.value = state.profile.city;
}
pf.addEventListener('submit', (e) => {
  e.preventDefault();
  state.profile = {
    name: pf.name.value.trim(),
    birth: pf.birth.value,
    time: pf.noTime.checked || !pf.time.value ? null : pf.time.value,
    city: Number(pf.city.value),
  };
  store.set('profile', state.profile);
  show('step-photo');
});

function sajuOf({ birth, time, city = 0 }) {
  const [year, month, day] = birth.split('-').map(Number);
  const [hour, minute] = time ? time.split(':').map(Number) : [null, 0];
  return computeSaju({ year, month, day, hour, minute, longitude: CITIES[city].lon });
}

// ── 3. 사진 ──
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
  status('분석 중… (1초)');
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
  status('분석 중…');
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
  const issue = poseIssue(metrics, expression);
  drawLandmarks(frames.at(-1).landmarks, w, h);
  if (issue) return status(issue);
  state.face = { el: faceElement(metrics), metrics };
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

// ── 4. 결과 ──
document.querySelectorAll('[role=tab]').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('[data-panel]').forEach((p) => {
      p.hidden = p.dataset.panel !== tab.dataset.tab;
    });
    if (tab.dataset.tab === 'friends') renderGraph();
  }),
);

const elBadge = (el) => `<span class="el el-${el}">${ELEMENTS[el]}${ELEMENTS_HANJA[el]}</span>`;

function renderResult() {
  const { profile } = state;
  const face = (state.face = { ...state.face, el: faceElement(state.face.metrics) });
  const saju = (state.saju = sajuOf(profile));
  const ft = FACE_TYPES[face.el];
  const bridge = bridgeReading(face.el, saju);

  document.querySelector('[data-panel=face]').innerHTML = `
    <p class="eyebrow">${esc(profile.name)}님의 얼굴은</p>
    <h2 class="big">${ft.emoji} ${ft.name}</h2>
    <p class="hint">${ft.shape}</p>
    <p>${ft.text}</p>
    <dl class="reading">${readFeatures(face.metrics).map((r) => `<dt>${r.part}</dt><dd>${r.text}</dd>`).join('')}</dl>
    <div class="bridge">
      <p class="eyebrow">관상에서 사주로</p>
      <h3>${bridge.title}</h3>
      <p>${bridge.text}</p>
      ${bridge.notes.map((n) => `<p class="note">✨ ${n}</p>`).join('')}
      <button class="link" data-goto="saju">사주 자세히 보기 →</button>
    </div>`;

  const p = saju.pillars;
  const cols = [['시', p.hour], ['일', p.day], ['월', p.month], ['년', p.year]];
  const max = Math.max(...saju.counts);
  const ds = DAY_STEM_TEXT[p.day.stem];
  document.querySelector('[data-panel=saju]').innerHTML = `
    <p class="eyebrow">${esc(profile.name)}님의 사주 · ${saju.animal}띠</p>
    <table class="pillars"><tr>${cols.map(([k]) => `<th>${k}주</th>`).join('')}</tr>
      <tr>${cols.map(([, c]) => `<td>${c ? `<span class="el-${STEM_ELEMENT[c.stem]}">${c.hanja[0]}</span><small>${c.name[0]}</small>` : '?'}</td>`).join('')}</tr>
      <tr>${cols.map(([, c]) => `<td>${c ? `<span class="el-${BRANCH_ELEMENT[c.branch]}">${c.hanja[1]}</span><small>${c.name[1]}</small>` : '?'}</td>`).join('')}</tr>
    </table>
    ${saju.hasTime ? '' : '<p class="hint">태어난 시간을 모르면 시주를 빼고 6글자로 풀어요.</p>'}
    <h3>일간 ${elBadge(saju.dayElement)} — ${ds.title}</h3>
    <p>${ds.text}</p>
    <h3>오행 분포 <small class="hint">${saju.strength}</small></h3>
    <div class="bars">${saju.counts
      .map((c, i) => `<div class="bar"><span>${ELEMENTS[i]}</span><i style="--w:${max ? (c / max) * 100 : 0}%" class="bg-${i}"></i><b>${c}</b></div>`)
      .join('')}</div>
    <p>부족한 기운은 ${elBadge(saju.lacking)} (${ELEMENT_TRAIT[saju.lacking]}).
      ${ELEMENT_DIRECTION[saju.lacking]}쪽 방향, ${['초록', '빨강', '노랑·베이지', '흰색·은색', '검정·남색'][saju.lacking]} 계열이 운을 보완해요.</p>
    ${saju.excess !== null ? `<p>넘치는 기운은 ${elBadge(saju.excess)}. 과하면 ${ELEMENT_TRAIT[saju.excess].split('·')[0]}이 지나칠 수 있어요.</p>` : ''}
    <p class="fine">절기는 태양 황경으로 계산하고, 시간은 출생지 경도로 보정해요(균시차 미반영). 신강·신약과 부족 오행은 단순화한 계산이에요.</p>`;

  document.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => document.querySelector(`[role=tab][data-tab=${b.dataset.goto}]`).click()),
  );

  renderOrigins();
  $('#place-result').innerHTML = '';
  $('#place-status').textContent = state.photoGps ? '올린 사진에 촬영 위치가 있어요.' : '';
  renderPhotoPlaceButton();
  show('step-result');
  document.querySelector('[role=tab][data-tab=face]').click();
  if (state.invite && !$('#btn-reply')) {
    $('#invite').innerHTML += `<br><button class="primary small" id="btn-reply">${esc(state.invite.name)}님에게 내 결과 보내기</button>`;
    $('#btn-reply').addEventListener('click', shareInvite);
  }
}

// ── 위치 ──
function origins() {
  const list = [{ ...CITIES[state.profile.city], name: `출생지(${CITIES[state.profile.city].name})` }];
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
  const r = evaluateLocation({ origin, here, saju: state.saju, faceEl: state.face.el });
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

// ── 관계도 ──
function me() {
  return toPerson(state.profile.name, state.saju, state.face.el);
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
  const f = e.target;
  const s = sajuOf({ birth: f.birth.value, time: f.time.value || null });
  addFriend(toPerson(f.name.value.trim(), s, null));
  f.reset();
  renderGraph();
});

async function shareInvite() {
  const url = `${location.origin}${location.pathname}#f=${encodePerson(me())}`;
  const text = `${state.profile.name}의 얼굴사주 — 나랑 궁합 볼래? 👀`;
  try {
    if (navigator.share) return await navigator.share({ title: '얼굴사주', text, url });
  } catch {
    return; // 사용자가 취소
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert('초대 링크를 복사했어요!');
  } catch {
    prompt('이 링크를 복사해 보내 주세요', url);
  }
}
$('#btn-invite').addEventListener('click', shareInvite);

$('#btn-graph-png').addEventListener('click', async () => {
  if (!state.friends.length) return;
  const { svg } = buildGraph(me(), state.friends);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1128;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  await saveCanvas(c, '얼굴사주-관계도.png');
});

// ── 결과 카드 ──
$('#btn-card').addEventListener('click', async () => {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d');
  const ft = FACE_TYPES[state.face.el];
  const p = state.saju.pillars;
  const bridge = bridgeReading(state.face.el, state.saju);
  g.fillStyle = '#f6efe2';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#b8862f';
  g.lineWidth = 6;
  g.strokeRect(40, 40, 1000, 1270);
  g.textAlign = 'center';
  g.fillStyle = '#6b5a45';
  g.font = '500 40px sans-serif';
  g.fillText(`${state.profile.name}님의 얼굴사주`, 540, 150);
  g.font = '160px sans-serif';
  g.fillText(ft.emoji, 540, 360);
  g.fillStyle = '#2b2118';
  g.font = '800 96px sans-serif';
  g.fillText(ft.name, 540, 500);
  g.font = '700 52px sans-serif';
  g.fillText(`${p.day.hanja}일주 · ${state.saju.animal}띠`, 540, 600);
  g.fillStyle = '#9b3d2e';
  g.font = '800 60px sans-serif';
  g.fillText(`“${bridge.title}”`, 540, 740);
  g.fillStyle = '#2b2118';
  g.font = '400 36px sans-serif';
  wrap(g, bridge.text, 540, 830, 880, 54);
  if (state.lastPlace) {
    g.font = '700 44px sans-serif';
    g.fillText(`오늘 이 자리: ${state.lastPlace.verdict.emoji} ${state.lastPlace.verdict.label}`, 540, 1150);
  }
  g.fillStyle = '#9a8f80';
  g.font = '400 30px sans-serif';
  g.fillText('얼굴사주 · 재미로 보는 관상×사주', 540, 1260);
  await saveCanvas(c, '얼굴사주.png');
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
}

async function saveCanvas(c, filename) {
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: '얼굴사주' });
  } catch {
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('이 기기에 저장된 내 정보와 친구 목록을 지울까요?')) return;
  store.clear();
  location.reload();
});

// ── 시작 ──
readInvite();
if (store.get('consent') && state.profile && state.face) renderResult();
else if (store.get('consent')) show('step-profile');
