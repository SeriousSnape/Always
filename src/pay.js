// 토스페이먼츠 결제위젯 v2 → 성공 시 서버 승인 → 결과 화면
import { TOSS_CLIENT_KEY } from './config.js';
import { confirmPayment } from './paid.js';

const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const say = (t) => ($('#pay-status').textContent = t);
const here = () => location.href.split('?')[0];

async function start() {
  const order = q.get('order');
  const token = q.get('token');
  const amount = Number(q.get('amount'));
  const orderName = q.get('name') || '정밀 관상';
  $('#pay-meta').textContent = `${orderName} · ${amount.toLocaleString()}원`;

  // eslint-disable-next-line no-undef
  const toss = TossPayments(TOSS_CLIENT_KEY);
  // eslint-disable-next-line no-undef
  const widgets = toss.widgets({ customerKey: TossPayments.ANONYMOUS });
  await widgets.setAmount({ currency: 'KRW', value: amount });
  await Promise.all([
    widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
    widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
  ]);
  $('#btn-pay').disabled = false;
  $('#btn-pay').addEventListener('click', async () => {
    try {
      await widgets.requestPayment({
        orderId: order,
        orderName,
        successUrl: `${here()}?step=success&token=${token}`,
        failUrl: `${here()}?step=fail&order=${order}&token=${token}&amount=${amount}`,
      });
    } catch (e) {
      say(e?.message ?? '결제를 시작하지 못했어요.');
    }
  });
}

async function success() {
  $('#btn-pay').hidden = true;
  say('결제를 확인하는 중이에요…');
  const orderId = q.get('orderId');
  const token = q.get('token');
  const r = await confirmPayment({ paymentKey: q.get('paymentKey'), orderId, amount: Number(q.get('amount')), token });
  if (r.ok) location.replace(`result.html?order=${orderId}&token=${token}`);
  else say(`결제 승인에 실패했어요(${r.code ?? r.error}). 돈은 빠져나가지 않았어요. ${r.message ?? ''}`);
}

const step = q.get('step');
if (step === 'success') success();
else if (step === 'fail') {
  say(`결제가 취소되었거나 실패했어요. ${q.get('message') ?? ''}`);
  start();
} else start();
