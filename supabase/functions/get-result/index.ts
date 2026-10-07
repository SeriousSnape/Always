// 결과 조회: 주문 ID + 열쇠(token). 해설이 아직이면 상태만 준다.
// 결제는 됐는데 생성이 멈췄으면(3분 넘게, 3번까지) 다시 시작한다.
import { cors, json, db } from '../_shared/http.ts';
import { generate } from '../_shared/generate.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order');
  const token = url.searchParams.get('token');
  if (!orderId || !token) return json(req, { error: 'params' }, 400);

  const { data: o } = await db()
    .from('orders')
    .select('status, access_token, brief, narrative, generation_started_at, generation_attempts, expires_at')
    .eq('id', orderId)
    .single();
  if (!o || o.access_token !== token) return json(req, { error: 'order' }, 404);
  if (new Date(o.expires_at) < new Date()) return json(req, { error: 'expired' }, 410);

  if (o.status === 'paid') {
    const stale = !o.generation_started_at || Date.now() - new Date(o.generation_started_at).getTime() > 180_000;
    if (stale && o.generation_attempts < 3) {
      // @ts-ignore EdgeRuntime 은 Supabase 런타임 전역
      EdgeRuntime.waitUntil(generate(orderId).catch((e) => console.error(e)));
    }
    if (o.generation_attempts >= 3 && stale) return json(req, { status: 'failed' });
  }
  return json(req, { status: o.status, brief: o.status === 'done' ? o.brief : undefined, narrative: o.narrative ?? undefined });
});
