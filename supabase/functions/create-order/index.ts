// 주문 만들기: 판정 재료(brief)를 받아 금액을 서버에서 정하고 결제 대기 주문을 만든다.
import { cors, json, db, PRICE, ORDER_NAME } from '../_shared/http.ts';

const MAX_BRIEF = 80_000; // 바이트

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
  const raw = await req.text();
  if (raw.length > MAX_BRIEF) return json(req, { error: 'too_large' }, 413);
  let body: { brief?: { sections?: unknown[]; worry?: unknown } };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(req, { error: 'json' }, 400);
  }
  const brief = body.brief;
  if (!brief || !Array.isArray(brief.sections) || brief.sections.length < 5) return json(req, { error: 'brief' }, 400);
  if (brief.worry != null && (typeof brief.worry !== 'string' || brief.worry.length > 300)) return json(req, { error: 'worry' }, 400);

  const { data, error } = await db()
    .from('orders')
    .insert({ amount: PRICE, order_name: ORDER_NAME, brief })
    .select('id, amount, order_name, access_token')
    .single();
  if (error) return json(req, { error: 'db' }, 500);
  return json(req, { orderId: data.id, amount: data.amount, orderName: data.order_name, token: data.access_token });
});
