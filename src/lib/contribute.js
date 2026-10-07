// 보정용 측정값 기여 — 사진·얼굴 좌표는 보내지 않고 비율값과 성별·연령대만 보낸다.
// 받는 쪽: Supabase 함수 submit_calibration (supabase/migrations/…_calibration.sql).
// 지표는 이름:값 객체로 보내므로 지표가 늘어도 표 구조를 바꿀 필요가 없다.
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
    metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, round(metrics[k])])),
  };
}

/**
 * Supabase RPC로 보낸다. anon 키는 공개돼도 되는 키다(표는 직접 못 건드리고 이 함수만 부를 수 있다).
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function sendPayload({ url, anonKey }, payload) {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/submit_calibration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ p: payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const out = await res.json();
  if (!out?.ok) throw new Error(out?.error ?? 'unknown');
  return out;
}
