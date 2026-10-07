// 유료 주문 — Supabase Edge Functions 호출
import { SUPABASE } from './config.js';

const fn = (name) => `${SUPABASE.url.replace(/\/$/, '')}/functions/v1/${name}`;
const headers = () => ({
  'Content-Type': 'application/json',
  ...(SUPABASE.anonKey ? { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` } : {}),
});

async function call(name, init) {
  const res = await fetch(fn(name), { ...init, headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !body.error) body.error = `http_${res.status}`;
  return body;
}

/** 판정 재료로 주문을 만든다 → { orderId, amount, orderName, token } */
export const createOrder = (brief) => call('create-order', { method: 'POST', body: JSON.stringify({ brief }) });

/** 토스 결제 성공 뒤 서버 승인 */
export const confirmPayment = (p) => call('confirm-payment', { method: 'POST', body: JSON.stringify(p) });

/** 결과(해설) 조회 */
export const getResult = (order, token) =>
  call(`get-result?order=${encodeURIComponent(order)}&token=${encodeURIComponent(token)}`, { method: 'GET' });
