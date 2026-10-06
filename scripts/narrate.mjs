// AI 해설 생성 시험: 예시 인물 판정 → Claude → 출력 검사 → 어긋난 칸만 다시 생성
// 사용: ANTHROPIC_API_KEY=... node scripts/narrate.mjs [out.json]
// 서비스에서는 같은 흐름을 Supabase 함수에서 돌린다(결제 확인 뒤).
import { writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { readFace, yearlyFlow } from '../src/lib/reading.js';
import { buildBrief, checkNarrative, SYSTEM_PROMPT, NARRATIVE_SCHEMA, userMessage } from '../src/lib/narrative.js';
import { SAMPLE } from '../src/sample/me.js';

const client = new Anthropic();
const MODEL = 'claude-opus-5-5';

async function ask(messages) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // 안전 분류기가 거절하면 서버가 권장 모델로 다시 돌린다
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: { type: 'json_schema', schema: NARRATIVE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages,
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error(`거절됨: ${msg.stop_details?.category ?? ''}`);
  if (msg.stop_reason === 'max_tokens') throw new Error('출력이 잘렸다(max_tokens)');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { json: JSON.parse(text), msg };
}

const opts = { forehead: SAMPLE.forehead, gender: SAMPLE.gender };
const reading = readFace(SAMPLE.metrics, opts);
const brief = buildBrief(reading, yearlyFlow(SAMPLE.metrics, SAMPLE.birthYear, opts, SAMPLE.thisYear), SAMPLE);

const messages = [{ role: 'user', content: userMessage(brief) }];
let { json, msg } = await ask(messages);
let usage = [msg.usage];
let check = checkNarrative(json, brief);

// 어긋난 칸만 한 번 다시
if (!check.ok) {
  const bad = [...new Set(check.problems.map((p) => p.key))].filter((k) => k !== 'followups');
  console.log('다시 생성:', check.problems);
  messages.push(
    { role: 'assistant', content: msg.content },
    {
      role: 'user',
      content: `검사에서 다음이 어긋났어. 전체를 같은 형식으로 다시 주되, 문제없는 칸은 그대로 두고 아래 칸만 고쳐 줘.\n${check.problems.map((p) => `- ${p.key}: ${p.why}`).join('\n')}`,
    },
  );
  const again = await ask(messages);
  usage.push(again.msg.usage);
  const fixed = again.json;
  // 고친 칸만 받아들인다
  json = {
    sections: json.sections.map((s) => (bad.includes(s.key) ? fixed.sections.find((f) => f.key === s.key) ?? s : s)),
    followups: fixed.followups?.length === 3 ? fixed.followups : json.followups,
  };
  check = checkNarrative(json, brief);
}

const outPath = process.argv[2] ?? 'src/sample/narrative.ai.json';
writeFileSync(outPath, JSON.stringify({ ...json, generatedBy: msg.model, check }, null, 2));
console.log('검사:', check.ok ? '통과' : check.problems);
console.log('토큰:', usage.map((u) => `in ${u.input_tokens} / out ${u.output_tokens}`).join(', '));
console.log('저장:', outPath);
