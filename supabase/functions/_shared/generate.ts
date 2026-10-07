// 결제 승인 뒤 해설 생성: Claude → 출력 검사 → 어긋난 칸만 한 번 다시 → 저장
import Anthropic from 'npm:@anthropic-ai/sdk';
import { SYSTEM_PROMPT, NARRATIVE_SCHEMA, userMessage, checkNarrative } from './narrative.js';
import { db } from './http.ts';

const MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';

async function ask(client: Anthropic, messages: Anthropic.Beta.BetaMessageParam[]) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    // 안전 분류기가 거절하면 서버가 권장 모델로 다시 돌린다
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: NARRATIVE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages,
  } as never);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('refusal');
  if (msg.stop_reason === 'max_tokens') throw new Error('max_tokens');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  return { json: JSON.parse(text), msg };
}

export async function generate(orderId: string) {
  const sb = db();
  const { data: order } = await sb.from('orders').select('id, status, brief, generation_attempts').eq('id', orderId).single();
  if (!order || order.status !== 'paid') return;
  await sb
    .from('orders')
    .update({ generation_started_at: new Date().toISOString(), generation_attempts: order.generation_attempts + 1 })
    .eq('id', orderId);

  try {
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const brief = order.brief;
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: userMessage(brief) }];
    let { json, msg } = await ask(client, messages);
    let check = checkNarrative(json, brief);
    if (!check.ok) {
      const bad = [...new Set(check.problems.map((p: { key: string }) => p.key))];
      messages.push(
        { role: 'assistant', content: msg.content as never },
        {
          role: 'user',
          content: `검사에서 다음이 어긋났어. 전체를 같은 형식으로 다시 주되, 문제없는 칸은 그대로 두고 아래 칸만 고쳐 줘.\n${check.problems
            .map((p: { key: string; why: string }) => `- ${p.key}: ${p.why}`)
            .join('\n')}`,
        },
      );
      const again = await ask(client, messages);
      json = {
        sections: json.sections.map((s: { key: string }) =>
          bad.includes(s.key) ? again.json.sections.find((f: { key: string }) => f.key === s.key) ?? s : s,
        ),
        followups: again.json.followups?.length === 3 ? again.json.followups : json.followups,
      };
      msg = again.msg;
      check = checkNarrative(json, brief);
    }
    // 검사에 끝까지 걸린 칸은 보여 주지 않는다(지어낸 원문·등급 뒤집기 방지)
    const badKeys = new Set(check.problems.map((p: { key: string }) => p.key));
    const safe = { ...json, sections: json.sections.filter((s: { key: string }) => !badKeys.has(s.key)) };
    await sb
      .from('orders')
      .update({ status: 'done', narrative: safe, check_result: { ...check, model: msg.model, usage: msg.usage } })
      .eq('id', orderId);
  } catch (e) {
    await sb.from('orders').update({ status: 'paid', error: String(e) }).eq('id', orderId);
    throw e;
  }
}
