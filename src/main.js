import { computeSaju, ELEMENTS, ELEMENTS_HANJA, ELEMENT_TRAIT, DAY_STEM_TEXT, STEM_ELEMENT, BRANCH_ELEMENT } from './lib/saju.js';
import { computeMetrics, averageMetrics, poseIssue, faceElement, FACE_TYPES } from './lib/physiognomy.js';
import { readFace, yearlyFlow, zoneGrades, GRADE, ZONE_RULE } from './lib/reading.js';
import { bridgeReading } from './lib/bridge.js';
import { CITIES, ELEMENT_DIRECTION, evaluateLocation, readExifGps } from './lib/location.js';
import { toPerson, encodePerson, decodePerson, compatibility } from './lib/compat.js';
import { josa } from './lib/josa.js';
import { buildGraph } from './graph.js';
import { buildFaceChart } from './chart.js';
import { detect, loadLandmarker, foreheadOf, complexionOf } from './face.js';
import { buildPayload, sendPayload, ageBandOf, AGE_BANDS } from './lib/contribute.js';
import { SUPABASE, COLLECT_ON, SERVER_ON } from './config.js';
import { prepare } from './lib/prepare.js';
import { createOrder } from './paid.js';
import { solveDepth, profileMetrics, quickYaw } from './lib/scan.js';

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
  face: store.get('face'), // { metrics, forehead }
  gender: store.get('gender'), // 'm' | 'f' | null — 유년운기 男左女右 및 성별에 따라 다른 원문
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
  box.innerHTML = `<b>${esc(p.name)}</b>님이 관상을 보고 보냈어요. 나도 봐 볼까요?`;
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
  if (state.face?.metrics && !$('#step-result').hidden) renderResult();
}

// 성별 (선택) — 원전의 男左女右와 성별에 따라 다른 판정에 쓴다
if (state.gender) $('#gender').value = state.gender;
$('#gender').addEventListener('change', (e) => {
  state.gender = e.target.value || null;
  store.set('gender', state.gender);
  if (state.face?.metrics && !$('#step-result').hidden) renderResult();
});

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
    status('얼굴을 화면 가운데에 맞추고, 스캔 시작을 누른 뒤 안내대로 고개를 돌려 주세요.');
  } catch {
    status('카메라를 열 수 없어요. 사진 올리기를 이용해 주세요.');
  }
});

// 고개 돌리기 스캔: 정면 → 한쪽 → 반대쪽. 여러 각도의 얼굴 점으로 코 높이·콧대 곧음 같은 깊이를 직접 잰다.
$('#btn-shoot').addEventListener('click', async () => {
  const btn = $('#btn-shoot');
  btn.disabled = true;
  $('#scan-guide').hidden = false;
  const say = (t) => ($('#scan-say').textContent = t);
  const mark = (id) => $(id).classList.add('done');
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d');
  const W = video.videoWidth;
  const H = video.videoHeight;
  work.width = W;
  work.height = H;
  const frontal = [];
  const turned = [];
  let best = null; // 가장 정면인 장면(판정·이마·기색용 화면)
  let step = 'front';
  let dir = 0;
  let maxA = 0;
  let maxB = 0;
  const t0 = performance.now();
  say('정면을 보고 잠깐 멈춰요');
  while (performance.now() - t0 < 25000) {
    wctx.drawImage(video, 0, 0, W, H);
    const r = await detect(work).catch(() => null);
    if (r && r.faces === 1) {
      const yaw = quickYaw(r.landmarks);
      $('#scan-dot').style.left = `${Math.max(2, Math.min(98, 50 + yaw * 120))}%`;
      const f = { landmarks: r.landmarks, w: W, h: H, expression: r.expression };
      if (Math.abs(yaw) < 0.035) {
        if (frontal.length < 8) frontal.push(f);
        if (!best || Math.abs(yaw) < best.yaw) {
          best = { yaw: Math.abs(yaw), frame: f };
          ctx.canvas.width = W;
          ctx.canvas.height = H;
          ctx.drawImage(work, 0, 0);
        }
      } else if (Math.abs(yaw) > 0.06 && Math.abs(yaw) < 0.4) {
        turned.push(f);
      }
      if (step === 'front' && frontal.length >= 6) {
        step = 'a';
        mark('#sc-front');
        say('천천히 한쪽으로 고개를 돌려요');
      } else if (step === 'a' && Math.abs(yaw) > 0.06) {
        dir = dir || Math.sign(yaw);
        if (Math.sign(yaw) === dir) maxA = Math.max(maxA, Math.abs(yaw));
        if (maxA > 0.16) {
          step = 'b';
          mark('#sc-a');
          say('좋아요. 이번엔 반대쪽으로 천천히');
        }
      } else if (step === 'b' && Math.sign(yaw) === -dir) {
        maxB = Math.max(maxB, Math.abs(yaw));
        if (maxB > 0.16) {
          mark('#sc-b');
          step = 'done';
          break;
        }
      }
    }
    await new Promise((res) => setTimeout(res, 60));
  }
  stopCamera();
  $('#scan-guide').hidden = true;
  btn.disabled = false;
  if (frontal.length < 3) return status('정면 얼굴을 충분히 잡지 못했어요. 밝은 곳에서 다시 해 주세요.');
  let scan = null;
  if (step === 'done' && turned.length >= 6) {
    const solved = solveDepth(frontal, turned);
    const angles = solved?.angles ?? [];
    // 양쪽으로 12도 이상 돌린 장면이 있어야 믿는다
    if (solved && Math.min(...angles) < -12 && Math.max(...angles) > 12) scan = profileMetrics(solved);
  }
  await finishAnalysis(
    frontal.map((f) => ({ landmarks: f.landmarks, faces: 1, expression: f.expression })),
    W,
    H,
    scan,
  );
  if (!scan) status('고개 돌리기를 끝까지 못 해서 정면만으로 봤어요. 옆모습으로 보는 코의 형 등은 빠졌어요.');
});

$('#file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  stopCamera();
  status('관상을 보는 중…');
  try {
    // 사진 위치(EXIF)는 잠가 둔 '이 자리' 기능(?all)에서만 읽는다
    state.photoGps = SHOW_ALL ? readExifGps(await file.arrayBuffer()) : null;
    const img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const r = await detect(canvas);
    await finishAnalysis(r ? [r] : [], canvas.width, canvas.height);
  } catch (err) {
    console.error(err);
    status('사진을 분석하지 못했어요. 다른 사진으로 시도해 주세요.');
  }
  e.target.value = '';
});

async function finishAnalysis(frames, w, h, scan = null) {
  canvas.hidden = false;
  $('#stage-empty').hidden = true;
  if (!frames.length) return status('얼굴을 찾지 못했어요. 밝은 곳에서 정면으로 다시 찍어 주세요.');
  if (frames.some((f) => f.faces > 1)) return status('한 사람만 나온 사진으로 해 주세요.');
  const metrics = averageMetrics(frames.map((f) => computeMetrics(f.landmarks, w, h)));
  if (scan) Object.assign(metrics, scan);
  const expression = {
    smile: Math.min(...frames.map((f) => f.expression.smile)),
    jawOpen: Math.min(...frames.map((f) => f.expression.jawOpen)),
  };
  const issue = poseIssue(metrics, expression);
  if (issue) {
    drawLandmarks(frames.at(-1).landmarks, w, h);
    return status(issue);
  }
  // 점을 그리기 전에 머리카락 영역을 본다 (麻衣 p49: 상정은 머리선부터)
  const forehead = await foreheadOf(canvas, frames.at(-1).landmarks);
  const complexion = complexionOf(canvas, frames.at(-1).landmarks, forehead);
  drawLandmarks(frames.at(-1).landmarks, w, h);
  state.face = { metrics, forehead, complexion };
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

// ── 2. 관상 결과 (docs/관상-기준.md) ──
const elBadge = (el) => `<span class="el el-${el}">${ELEMENTS[el]}${ELEMENTS_HANJA[el]}</span>`;
const chip = (grade) => `<span class="chip chip-${GRADE[grade].tone}">${GRADE[grade].short}</span>`;
const conf = () => '';
const refsHtml = (refs) =>
  refs.length
    ? `<ul class="refs">${refs
        .map((r) => `<li><q lang="zh-Hant">${r.q}</q><cite>${r.s}</cite><span>${r.t}</span></li>`)
        .join('')}</ul>`
    : '';
const noteHtml = () => ''; // 무료 결과에는 측정하지 못한 부분에 대한 설명을 쓰지 않는다
const judgeHtml = (j) => `<p class="look">${j.look}</p>${refsHtml(j.refs)}${noteHtml(j.note)}`;
const subj = (name, domain) => `${name}(${domain})${josa(domain, '이/가').slice(domain.length)}`;
const opts = () => ({ forehead: state.face.forehead ?? null, gender: state.gender });

function renderResult() {
  const m = state.face.metrics;
  const res = (state.reading = readFace(m, opts()));
  state.palaces = res.palaces;
  const sum = res.summary;
  const fh = state.face.forehead;

  $('#forehead-notice').hidden = fh?.status === 'visible';
  $('#forehead-notice').innerHTML = `
    <b>상정(이마)은 명확하지 않아요.</b> ${esc(fh?.reason ?? '이 결과는 이마를 확인하기 전에 저장됐어요')}.
    원전은 상정을 머리선(髮際)부터 재므로(「髮際至印堂 上停」, 麻衣 p49), 이마를 가리면 상정·삼정 균형·이마 위쪽 운기를 판정하지 않습니다.
    <button class="link" id="btn-retry-forehead">이마를 드러내고 다시 찍기</button>`;
  $('#btn-retry-forehead')?.addEventListener('click', retry);

  $('#summary').innerHTML = `
    <p class="eyebrow">총평 · 達磨相訣 第四法·第五法</p>
    <h2 class="headline">${sum.best ? `${subj(sum.best.name, sum.best.domain)} 가장 좋은 얼굴` : '크게 기운 자리 없이 고른 얼굴'}</h2>
    <p class="sub">${sum.worst ? `약한 자리는 ${sum.worst.name}(${sum.worst.domain})` : '흉으로 판정된 궁이 없어요'}</p>
    <ul class="pillars4">${sum.pillars.filter((p) => p.grade !== 'unread').map((p) => `<li><b>${p.q}</b><span>${p.name}</span>${chip(p.grade)}</li>`).join('')}</ul>
    ${sum.best ? `<blockquote><q lang="zh-Hant">${sum.best.refs[0].q}</q> <cite>${sum.best.refs[0].s}</cite><br>${sum.best.refs[0].t}</blockquote>` : ''}
    <ul class="palace-grid" aria-label="십이궁 한눈에 보기">
      ${res.palaces.map((p) => `<li><a href="#palace-${p.key}"><span>${p.name}</span><small>${p.domain}</small>${chip(p.grade)}</a></li>`).join('')}
    </ul>
    ${refsHtml(sum.method)}
`;

  renderYearly();
  renderChart();

  const t = res.thirds;
  $('#thirds').innerHTML = `
    <h2>삼정(三停) ${chip(t.grade)}</h2>
    <p class="hint">「髮際至印堂 上停 / 山根至準頭 中停 / 人中至地閣 下停」(麻衣 p49). 이마는 초년, 코는 중년, 턱은 말년을 맡아요.</p>
    ${
      t.parts
        ? `<ol class="thirds">${t.parts.map((x) => `<li><b>${x.name}</b><small>${x.ages}</small><span>${x.area}</span><em>${Math.round(x.v * 100)}%</em></li>`).join('')}</ol>`
        : ''
    }
    ${judgeHtml(t)}`;

  $('#wuyue').innerHTML = `
    <h2>오악(五嶽)</h2>
    <p class="hint">「五嶽須要相朝揖」(麻衣 p41). 이마·두 광대·코·턱을 다섯 산으로 보고, 솟아서 서로 향해야 좋다고 봐요.</p>
    ${res.wuyue.map((w) => `<article class="palace"><header><h3>${w.name} <small>${w.area}</small> ${conf(w.conf)}</h3>${chip(w.grade)}</header>${judgeHtml(w)}</article>`).join('')}`;

  $('#wuguan').innerHTML = `
    <h2>오관(五官)</h2>
    <p class="hint">${res.wuguanSummary.text} ${refsHtml(res.wuguanSummary.refs)}</p>
    ${res.wuguan.filter((w) => w.grade !== 'unread').map((w) => `<article class="palace"><header><h3>${w.name} <small>${w.hanja} · ${w.area}</small></h3>${chip(w.grade)}</header>${judgeHtml(w)}</article>`).join('')}
    <article class="palace"><header><h3>인중 <small>人中</small></h3>${chip(res.injung.grade)}</header>${judgeHtml(res.injung)}</article>`;

  $('#palaces').innerHTML = `
    <h2>십이궁(十二宮)</h2>
    <p class="hint">麻衣 p33~39 「十二宮」과 p165~169 「十二宮剋應訣」, 부모궁은 p39~40 「十二宮秘訣」을 따릅니다.</p>
    ${res.palaces
      .map(
        (p) => `<article class="palace" id="palace-${p.key}">
          <header><h3>${p.name} <small>${p.hanja}</small> ${conf(p.conf)}</h3>${chip(p.grade)}</header>
          <p class="palace-area">${p.area} · ${p.domain}</p>
          ${judgeHtml(p)}
        </article>`,
      )
      .join('')}`;

  $('#relations').innerHTML = `
    <h2>관계로 보는 자리</h2>
    <p class="hint">원전은 상대의 얼굴이 아니라 내 얼굴의 해당 자리로 형제·배우자·자녀·아랫사람·부모를 봅니다. 사람을 고르는 법으로는 「擇交在眼 眼惡者情必薄 交之有害」(벗은 눈을 보고 고르라, 麻衣 p146)만 있는데, 눈빛은 사진으로 볼 수 없어 판정하지 않았어요.</p>
    ${res.relations
      .map(
        (r) => `<div class="rel"><h3>${r.who}</h3><ul>${r.items
          .map(([name, j]) => `<li>${chip(j.grade)} <b>${name}</b> ${j.look}${j.refs[0] ? ` — <q lang="zh-Hant">${j.refs[0].q}</q> <cite>${j.refs[0].s}</cite>` : ''}</li>`)
          .join('')}</ul></div>`,
      )
      .join('')}`;

  $('#unread').innerHTML = `<p class="fine">『增補麻衣相法全編』·『相理衡眞』 권3의 전통 해석을 옮긴 풀이예요.</p>`;

  renderContribute();
  show('step-result');
  // 관상 × 사주 연결은 보류 — ?all 에서만
  $('#saju-unlock').hidden = !SHOW_ALL || !!state.profile;
  if (state.profile && SHOW_ALL) renderSaju();
  else {
    $('#saju').hidden = true;
    for (const id of ['premium', 'place', 'friends']) $(`#${id}`).hidden = true;
  }
}

// ── 보정용 측정값 기여 (docs/데이터-수집.md) ──
$('#age-band').insertAdjacentHTML('beforeend', AGE_BANDS.map((b) => `<option>${b}</option>`).join(''));
$('#agree-contribute').addEventListener('change', (e) => {
  $('#btn-contribute').disabled = !e.target.checked;
});
function deviceId() {
  let id = store.get('device');
  if (!id) {
    id = crypto.randomUUID();
    store.set('device', id);
  }
  return id;
}
function renderContribute() {
  $('#contribute').hidden = !COLLECT_ON;
  if (!COLLECT_ON) return;
  if (!$('#age-band').value) $('#age-band').value = ageBandOf(state.birthYear);
  const sent = state.face.sent;
  $('#contribute-status').textContent = sent ? '이 측정값은 이미 보냈어요. 고마워요! 다시 찍어서 보내 주시면 측정이 얼마나 일정한지 확인하는 데 쓰여요.' : '';
  $('#btn-contribute').hidden = !!sent;
}
$('#btn-contribute').addEventListener('click', async () => {
  const btn = $('#btn-contribute');
  btn.disabled = true;
  $('#contribute-status').textContent = '보내는 중…';
  try {
    const payload = buildPayload({ ...state.face, gender: state.gender, ageBand: $('#age-band').value, device: deviceId() });
    await sendPayload(SUPABASE, payload);
    state.face.sent = true;
    store.set('face', state.face);
    renderContribute();
  } catch {
    $('#contribute-status').textContent = '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
    btn.disabled = false;
  }
});

// ── 관상도 ──
let chartMode = 'palace';
function currentChart() {
  const now = state.birthYear ? { year: THIS_YEAR, age: THIS_YEAR - state.birthYear + 1 } : null;
  return buildFaceChart({
    metrics: state.face.metrics,
    mode: chartMode,
    palaces: state.palaces,
    zones: zoneGrades(state.face.metrics, opts()),
    now,
    forehead: state.face.forehead,
  });
}
function renderChart() {
  $('#chart').innerHTML = currentChart().svg;
  $('#chart-palace').setAttribute('aria-selected', String(chartMode === 'palace'));
  $('#chart-yearly').setAttribute('aria-selected', String(chartMode === 'yearly'));
}
for (const [id, mode] of [['#chart-palace', 'palace'], ['#chart-yearly', 'yearly']]) {
  $(id).addEventListener('click', () => {
    chartMode = mode;
    renderChart();
  });
}
$('#btn-chart-png').addEventListener('click', async () => {
  const { svg, width, height } = currentChart();
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const scale = 1080 / width;
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = Math.round(height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  await saveCanvas(c, chartMode === 'palace' ? '십이궁도.png' : '유년운기도.png');
});

function renderYearly() {
  const box = $('#yearly');
  if (!state.birthYear) {
    state.flow = null;
    box.innerHTML = `
      <p class="eyebrow">유년운기(流年運氣) · 麻衣 p29~31</p>
      <h2>올해 내 얼굴의 어느 자리가 운을 맡고 있을까?</h2>
      <p>원전은 나이마다 운을 맡는 얼굴 자리를 정해 두었어요(1~14세 귀, 15세 이마, 28세 인당, 41세 산근, 48세 준두, 60세 입, 71세 지각…). 태어난 해를 고르면 올해와 앞으로 4년을 읽어 드려요.</p>
      <label>태어난 해 <select id="yearly-birth"><option value="">선택</option>${yearOptions}</select></label>`;
    $('#yearly-birth').addEventListener('change', (e) => {
      $('#birth-year').value = e.target.value;
      setBirthYear(e.target.value);
    });
    return;
  }
  const flow = (state.flow = yearlyFlow(state.face.metrics, state.birthYear, opts()));
  const now = flow[0];
  const sideNote = '';
  box.innerHTML = `
    <p class="eyebrow">유년운기 · ${now.year}년 · ${now.age}세(세는 나이)</p>
    <h2>올해는 <em>${now.area}</em>의 해 ${chip(now.grade)}</h2>
    <p class="hint">${now.range}는 이 자리가 운을 맡아요.</p>
    ${now.grade === 'unread' ? '' : judgeHtml(now)}
    ${sideNote}
    ${refsHtml(now.grade === 'good' ? [ZONE_RULE[0]] : now.grade === 'bad' ? [ZONE_RULE[1]] : [])}
    <ol class="flow">${flow
      .map((f) => `<li class="flow-${GRADE[f.grade].tone}"><b>${f.year}</b><small>${f.age}세</small><span>${f.area.replace(/\(.*\)/, '')}</span>${chip(f.grade)}</li>`)
      .join('')}</ol>
    ${flow
      .slice(1)
      .filter((f, i) => f.area !== flow[i].area)
      .map((f) => `<p class="next"><b>${f.year}년부터 ${f.area}</b> ${chip(f.grade)} — ${f.look}${f.refs?.[0] ? ` · <q lang="zh-Hant">${f.refs[0].q}</q> <cite>${f.refs[0].s}</cite>` : ''}</p>`)
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
  const faceEl = faceElement(state.face.metrics); // 사주 연결 보류 — ?all 전용
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
  const sum = state.reading.summary;
  const best = sum.best ? `${subj(sum.best.name, sum.best.domain)} 제일 좋대.` : '고른 얼굴이래.';
  const year = state.flow?.[0] ? ` 올해는 ${state.flow[0].area.replace(/\(.*\)/, '')}의 해래.` : '';
  shareLink(`마의상법으로 본 내 관상: ${best}${year} 너도 봐 봐 👀`);
});

$('#btn-card').addEventListener('click', async () => {
  const res = state.reading;
  const sum = res.summary;
  const now = state.flow?.[0];
  const headline = sum.best ? `${subj(sum.best.name, sum.best.domain)} 가장 좋은 얼굴` : '크게 기운 자리 없이 고른 얼굴';
  await Promise.all(['900 60px', '700 40px'].map((f) => document.fonts.load(`${f} "Noto Serif KR"`, headline))).catch(() => {});

  // 9:16 세로 이미지 — 맨 위에 관상도, 아래에 원전 풀이
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1920;
  const g = c.getContext('2d');
  const serif = (w, size) => `${w} ${size}px "Noto Serif KR", "Nanum Myeongjo", serif`;
  const sans = (w, size) => `${w} ${size}px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  g.fillStyle = '#1d1712';
  g.fillRect(0, 0, c.width, c.height);

  const chart = currentChart();
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chart.svg)}`;
  await img.decode();
  const ch = Math.min(1000, (chart.height / chart.width) * 1000);
  const cw = (chart.width / chart.height) * ch;
  g.drawImage(img, (c.width - cw) / 2, 40, cw, ch);

  g.textAlign = 'center';
  let y = 40 + ch + 76;
  g.fillStyle = '#c9a24a';
  g.font = sans(600, 30);
  g.fillText(state.profile?.name ? `${state.profile.name}님의 관상 총평` : '마의상법으로 본 나의 관상', 540, y);
  g.fillStyle = '#f3e3c3';
  g.font = serif(900, 60);
  y = wrap(g, headline, 540, y + 76, 940, 74);
  if (sum.best) {
    g.fillStyle = '#c9a24a';
    g.font = serif(700, 38);
    y = wrap(g, `「${sum.best.refs[0].q}」`, 540, y + 64, 940, 50);
    g.fillStyle = '#bfae95';
    g.font = sans(400, 28);
    y = wrap(g, `${sum.best.refs[0].t} (${sum.best.refs[0].s})`, 540, y + 44, 920, 40);
  }
  y += 90;

  g.textAlign = 'left';
  const line = (label, text) => {
    g.fillStyle = '#c9a24a';
    g.font = sans(700, 30);
    g.fillText(label, 90, y);
    g.fillStyle = '#f3e3c3';
    g.font = sans(400, 28);
    y = wrapLeft(g, text, 90, y + 44, 900, 40) + 56;
  };
  if (now) line(`${now.year}년 · ${now.area.replace(/\(.*\)/, '')}의 해 (${GRADE[now.grade].short})`, now.refs?.[0] ? `${now.look} — 「${now.refs[0].q}」 ${now.refs[0].t}` : now.look);
  line(`오관 · ${res.wuguanSummary.formed}/4 이루어짐`, res.wuguan.filter((w) => w.grade !== 'unread').map((w) => `${w.name} ${GRADE[w.grade].short}`).join(' · '));
  if (state.face.forehead?.status !== 'visible') line('상정(이마)', '이마가 드러나지 않아 판정하지 않음');

  g.textAlign = 'center';
  g.fillStyle = '#8c7b64';
  g.font = sans(400, 24);
  g.fillText('『麻衣相法』·『相理衡眞』 기준 · 전통 해석이며 과학적 예측이 아님', 540, 1880);
  await saveCanvas(c, '나의관상.png');
});

function wrapLeft(g, text, x, y, maxW, lh) {
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
  const r = evaluateLocation({ origin, here, saju: state.saju, faceEl: faceElement(state.face.metrics) });
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
  return toPerson(myName(), state.saju, faceElement(state.face.metrics));
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
function retry() {
  canvas.hidden = true;
  $('#stage-empty').hidden = false;
  status('이마를 드러내고(앞머리를 넘기고) 정면·무표정으로 찍어 주세요.');
  show('step-hero');
}
$('#btn-retry').addEventListener('click', retry);
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

// ── 정밀 관상(유료) 주문 ──
$('#btn-paid').addEventListener('click', async () => {
  const btn = $('#btn-paid');
  const person = {
    name: $('#paid-name').value.trim().slice(0, 12),
    worry: $('#paid-worry').value.trim().slice(0, 300),
    birthYear: state.birthYear ?? null,
    gender: state.gender ?? null,
    thisYear: THIS_YEAR,
    metrics: state.face.metrics,
    forehead: state.face.forehead,
    complexion: state.face.complexion ?? null,
  };
  if (!SERVER_ON) {
    // 서버 연결 전: 기기 안에서 원문 풀이로
    try {
      localStorage.setItem('gs:demo', JSON.stringify(person));
    } catch {}
    location.href = 'result.html?demo=1';
    return;
  }
  btn.disabled = true;
  $('#paid-status').textContent = '주문을 만드는 중…';
  const { brief } = prepare(person);
  const r = await createOrder(brief).catch(() => ({ error: 'network' }));
  if (r.error) {
    $('#paid-status').textContent = r.error === 'client_cap' || r.error === 'daily_cap' ? '오늘 무료 테스트 횟수를 다 썼어요. 내일 다시 해 주세요.' : `주문을 만들지 못했어요(${r.error}). 잠시 뒤 다시 눌러 주세요.`;
    btn.disabled = false;
    return;
  }
  // 측정값은 이 기기에만 남긴다(결과 화면의 그림용)
  try {
    localStorage.setItem(`gs:order:${r.orderId}`, JSON.stringify(person));
  } catch {}
  // 무료 테스트 모드면 결제 없이 바로 결과로
  if (r.free) location.href = `result.html?order=${r.orderId}&token=${r.token}`;
  else location.href = `pay.html?order=${r.orderId}&token=${r.token}&amount=${r.amount}&name=${encodeURIComponent(r.orderName)}`;
});
