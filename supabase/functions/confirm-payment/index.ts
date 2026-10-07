// 결제 승인: 토스페이먼츠 successUrl 로 돌아온 값을 서버에서 승인한다.
// 금액은 반드시 DB 의 주문 금액과 비교한다(브라우저 값을 믿지 않는다). 승인 뒤 해설 생성을 백그라운드로 시작한다.
import { cors, json, db } from '../_shared/http.ts';
import { generate } from '../_shared/generate.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
  const { paymentKey, orderId, amount, token } = await req.json().catch(() => ({}));
  if (!paymentKey || !orderId || !token) return json(req, { error: 'params' }, 400);

  const sb = db();
  const { data: order } = await sb.from('orders').select('id, status, amount, access_token').eq('id', orderId).single();
  if (!order || order.access_token !== token) return json(req, { error: 'order' }, 404);
  if (order.status !== 'pending') return json(req, { ok: true, status: order.status }); // 새로고침 등 중복 호출
  if (Number(amount) !== order.amount) return json(req, { error: 'amount' }, 400);

  const secret = Deno.env.get('TOSS_SECRET_KEY')!;
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${secret}:`)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': orderId,
    },
    body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
  });
  const payment = await res.json();
  if (!res.ok) {
    await sb.from('orders').update({ error: `confirm: ${payment?.code ?? res.status}` }).eq('id', orderId);
    return json(req, { error: 'confirm', code: payment?.code, message: payment?.message }, 400);
  }
  await sb
    .from('orders')
    .update({ status: 'paid', payment_key: paymentKey, payment, paid_at: new Date().toISOString() })
    .eq('id', orderId);

  // 응답은 바로 주고, 해설은 뒤에서 만든다(1~2분). 브라우저는 get-result 로 기다린다.
  // @ts-ignore EdgeRuntime 은 Supabase 런타임 전역
  EdgeRuntime.waitUntil(generate(orderId).catch((e) => console.error(e)));
  return json(req, { ok: true, status: 'paid' });
});
