/**
 * 관상 보정용 측정값 수집 — 구글 시트에 붙인 Apps Script.
 * 설치 방법은 docs/데이터-수집.md 참고.
 *
 * 받는 것: 얼굴 비율값(사진·좌표 아님), 성별, 연령대, 기기 임의 ID.
 * 열 순서는 src/lib/contribute.js 의 METRIC_KEYS 와 같아야 한다(테스트로 확인).
 */

var SCHEMA_VERSION = 1;
var METRIC_KEYS = ["aspect","jaw","upper","middle","lower","eyeGap","eyeTilt","eyeSize","noseWidth","noseLength","mouthWidth","lipThickness","asym","browGap","browLen","browEye","foreheadW","bridgeDepth","philtrum","browOver","browOverR","browOverL","browEyeR","browEyeL","eyeAspect","eyeAspectR","eyeAspectL","eyeTiltR","eyeTiltL","mouthCorner","upperLip","lowerLip","chinW","foreheadTilt","browAsym","cheekProm","jianmenFull","tearFull","noseMidHeight"];
var AGE_BANDS = ['', '10대', '20대', '30대', '40대', '50대', '60대 이상'];
var SHEET_NAME = 'raw';
var DAILY_LIMIT_PER_DEVICE = 10; // 반복성 확인용으로 같은 기기에서 여러 번은 허용

function header_() {
  return ['received_at', 'v', 'device', 'gender', 'age_band', 'forehead', 'upper3', 'middle3', 'lower3'].concat(METRIC_KEYS);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(header_());
  return sh;
}

function isNum_(x, lo, hi) {
  return typeof x === 'number' && isFinite(x) && x >= lo && x <= hi;
}

function validate_(p) {
  if (!p || p.v !== SCHEMA_VERSION) return 'version';
  if (typeof p.device !== 'string' || !/^[0-9a-f-]{16,40}$/.test(p.device)) return 'device';
  if (['', 'm', 'f'].indexOf(p.gender) < 0) return 'gender';
  if (AGE_BANDS.indexOf(p.ageBand) < 0) return 'ageBand';
  if (['', 'visible', 'covered', 'unclear'].indexOf(p.forehead) < 0) return 'forehead';
  if (p.thirds !== null && !(Array.isArray(p.thirds) && p.thirds.length === 3 && p.thirds.every(function (x) { return isNum_(x, 0.05, 0.9); }))) return 'thirds';
  if (!Array.isArray(p.metrics) || p.metrics.length !== METRIC_KEYS.length) return 'metrics';
  for (var i = 0; i < p.metrics.length; i++) {
    if (p.metrics[i] !== null && !isNum_(p.metrics[i], -20, 20)) return 'metric ' + METRIC_KEYS[i];
  }
  return null;
}

function doPost(e) {
  var p;
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'json' });
  }
  var bad = validate_(p);
  if (bad) return out_({ ok: false, error: bad });

  // 기기당 하루 제출 횟수 제한 (스팸으로 보정값이 오염되는 것을 막는다)
  var cache = CacheService.getScriptCache();
  var key = 'n:' + p.device;
  var n = Number(cache.get(key) || 0);
  if (n >= DAILY_LIMIT_PER_DEVICE) return out_({ ok: false, error: 'limit' });
  cache.put(key, String(n + 1), 21600); // 6시간(캐시 최대 보관 시간)

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var t = p.thirds || ['', '', ''];
    sheet_().appendRow([new Date(), p.v, p.device, p.gender, p.ageBand, p.forehead, t[0], t[1], t[2]].concat(
      p.metrics.map(function (x) { return x === null ? '' : x; })
    ));
  } finally {
    lock.releaseLock();
  }
  return out_({ ok: true });
}

function doGet() {
  return out_({ ok: true, service: 'gwansang-calibration', v: SCHEMA_VERSION });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
