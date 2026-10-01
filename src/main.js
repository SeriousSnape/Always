import { computeSaju, ELEMENTS, ELEMENTS_HANJA, ELEMENT_TRAIT, DAY_STEM_TEXT, STEM_ELEMENT, BRANCH_ELEMENT } from './lib/saju.js';
import { computeMetrics, averageMetrics, poseIssue, readFeatures, FACE_TYPES } from './lib/physiognomy.js';
import { kingVerdict } from './lib/king.js';
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

function renderResult() {
  const v = (state.verdict = kingVerdict(state.face.metrics));
  const ft = FACE_TYPES[v.el];
  $('#verdict').innerHTML = `
    <p class="eyebrow">내가 왕이 될 상인가?</p>
    <p class="answer">${v.answer}</p>
    <div class="rank${v.isKing ? ' king' : ''}">
      <span class="rank-hanja" aria-hidden="true">${v.hanja}</span>
      <h2 class="rank-title">${v.title}의 상</h2>
    </div>
    <div class="meter" role="img" aria-label="왕기 지수 ${v.score}점 (100점 만점, 85점 이상 왕)">
      <div class="meter-bar"><i style="--w:${v.score}%"></i><b class="meter-king" title="왕"></b></div>
      <p><span>왕기(王氣) 지수</span><strong>${v.score}</strong></p>
    </div>
    <p>${v.text}</p>
    <p class="face-type">${ft.emoji} 얼굴형은 <b>${ft.name}</b> — ${ft.shape}. ${ft.text}</p>`;

  $('#features').innerHTML = `
    <h2>부위별 관상</h2>
    <dl class="reading">${readFeatures(state.face.metrics).map((r) => `<dt>${r.part}</dt><dd>${r.text}</dd>`).join('')}</dl>
    <p class="fine">왕기 지수는 좌우 대칭, 삼정(이마·코·턱) 균형, 콧대, 턱, 눈꼬리를 합산해요.</p>`;

  show('step-result');
  if (state.profile) renderSaju();
  else {
    $('#saju-unlock').hidden = false;
    $('#saju').hidden = true;
    for (const id of ['premium', 'place', 'friends']) $(`#${id}`).hidden = true;
  }
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
  const v = state.verdict;
  shareLink(`나는 ${josa(v.title, '이/가')} 될 상이래 (왕기 ${v.score}점) 👑 너는 왕이 될 상이야?`);
});

$('#btn-card').addEventListener('click', async () => {
  const v = state.verdict;
  const ft = FACE_TYPES[v.el];
  await Promise.all(['900 300px', '700 48px', '400 36px'].map((f) => document.fonts.load(`${f} "Noto Serif KR"`, v.hanja + v.title))).catch(() => {});
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext('2d');
  const font = (w, size) => `${w} ${size}px "Noto Serif KR", "Nanum Myeongjo", serif`;
  g.fillStyle = '#1d1712';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 4;
  g.strokeRect(48, 48, 984, 1254);
  g.strokeRect(64, 64, 952, 1222);
  g.textAlign = 'center';
  g.fillStyle = '#c9a24a';
  g.font = font(500, 40);
  g.fillText(state.profile?.name ? `${state.profile.name}님은` : '내가 왕이 될 상인가?', 540, 170);
  g.fillStyle = '#f3e3c3';
  g.font = font(500, 44);
  g.fillText(v.answer, 540, 250);
  g.fillStyle = v.isKing ? '#e8c060' : '#f3e3c3';
  g.font = font(900, 300);
  g.fillText(v.hanja.length > 2 ? v.hanja.slice(0, 2) : v.hanja, 540, 590);
  g.font = font(800, 92);
  g.fillText(`${v.title}의 상`, 540, 740);
  // 왕기 막대
  g.fillStyle = '#3a2f25';
  g.fillRect(190, 820, 700, 22);
  g.fillStyle = '#c9a24a';
  g.fillRect(190, 820, 7 * v.score, 22);
  g.fillStyle = '#f3e3c3';
  g.font = font(700, 48);
  g.fillText(`왕기(王氣) ${v.score}`, 540, 920);
  g.font = font(400, 36);
  wrap(g, v.text, 540, 1010, 860, 54);
  g.fillStyle = '#bfae95';
  g.font = font(400, 34);
  g.fillText(`${ft.emoji} ${ft.name}`, 540, 1180);
  g.fillStyle = '#8c7b64';
  g.font = font(400, 28);
  g.fillText('내가 왕이 될 상인가? · 재미로 보는 관상', 540, 1250);
  await saveCanvas(c, `왕이될상-${v.title}.png`);
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
