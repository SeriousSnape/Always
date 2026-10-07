// 보정용 측정값 기여 — 사진·얼굴 좌표는 보내지 않고 비율값과 성별·연령대만 보낸다.
// 받는 쪽: apps-script/Code.gs (구글 Apps Script → 구글 시트). 열 순서는 양쪽이 같아야 한다.
import { BASE } from './physiognomy.js';

export const SCHEMA_VERSION = 2;
export const METRIC_KEYS = Object.keys(BASE);
export const AGE_BANDS = ['10대', '20대', '30대', '40대', '50대', '60대 이상'];

export function ageBandOf(birthYear, thisYear = new Date().getFullYear()) {
  if (!birthYear) return '';
  const age = thisYear - birthYear;
  if (age < 20) return '10대';
  if (age >= 60) return '60대 이상';
  return `${Math.floor(age / 10) * 10}대`;
}

/**
 * @param {object} p
 * @param {object} p.metrics computeMetrics 결과
 * @param {{status:string, thirds:object|null}|null} p.forehead
 * @param {'m'|'f'|null} p.gender
 * @param {string} p.ageBand
 * @param {string} p.device 기기마다 임의로 만든 ID (반복성 확인용, 개인 식별 불가)
 */
export function buildPayload({ metrics, forehead, gender, ageBand, device }) {
  const round = (x) => (Number.isFinite(x) ? Math.round(x * 1e5) / 1e5 : null);
  return {
    v: SCHEMA_VERSION,
    device,
    gender: gender === 'm' || gender === 'f' ? gender : '',
    ageBand: AGE_BANDS.includes(ageBand) ? ageBand : '',
    forehead: forehead?.status ?? '',
    thirds: forehead?.status === 'visible' ? [forehead.thirds.upper, forehead.thirds.middle, forehead.thirds.lower].map(round) : null,
    metrics: METRIC_KEYS.map((k) => round(metrics[k])),
  };
}

/** Apps Script는 CORS 응답을 주지 않으므로 text/plain + no-cors로 보낸다(응답은 읽지 못함). */
export async function sendPayload(url, payload) {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}
