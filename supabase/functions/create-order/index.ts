// 주문 만들기: 판정 재료(brief)를 받아 금액을 서버에서 정하고 결제 대기 주문을 만든다.
import { cors, json, db, PRICE, ORDER_NAME, FREE_MODE, FREE_DAILY_CAP, FREE_PER_CLIENT, clientHash } from '../_shared/http.ts';
import { generate } from '../_shared/generate.ts';

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

  const sb = db();
  const hash = await clientHash(req);

  if (FREE_MODE) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count: all } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('amount', 0).gte('created_at', since);
    if ((all ?? 0) >= FREE_DAILY_CAP) return json(req, { error: 'daily_cap' }, 429);
    const { count: mine } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('client_hash', hash).gte('created_at', since);
    if ((mine ?? 0) >= FREE_PER_CLIENT) return json(req, { error: 'client_cap' }, 429);
    const { data, error } = await sb
      .from('orders')
      .insert({ amount: 0, order_name: `${ORDER_NAME} (무료 테스트)`, brief, status: 'paid', paid_at: new Date().toISOString(), client_hash: hash })
      .select('id, access_token')
      .single();
    if (error) return json(req, { error: 'db' }, 500);
    // @ts-ignore EdgeRuntime 은 Supabase 런타임 전역
    EdgeRuntime.waitUntil(generate(data.id).catch((e) => console.error(e)));
    return json(req, { orderId: data.id, token: data.access_token, free: true });
  }

  const { data, error } = await sb
    .from('orders')
    .insert({ amount: PRICE, order_name: ORDER_NAME, brief, client_hash: hash })
    .select('id, amount, order_name, access_token')
    .single();
  if (error) return json(req, { error: 'db' }, 500);
  return json(req, { orderId: data.id, amount: data.amount, orderName: data.order_name, token: data.access_token });
});
