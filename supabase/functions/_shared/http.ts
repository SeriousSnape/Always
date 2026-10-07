// 공통: CORS, JSON 응답, 서비스 키 DB 클라이언트
import { createClient } from 'npm:@supabase/supabase-js@2';

const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim());

export function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allow = ORIGINS.includes('*') ? '*' : ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

export const db = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export const PRICE = Number(Deno.env.get('PRICE') ?? '990');
export const ORDER_NAME = '정밀 관상 · 내가 왕이 될 상인가?';

// 무료 테스트 모드: 결제 없이 바로 해설을 만든다. 하루 전체 한도와 요청자별 한도로 비용 폭주를 막는다.
export const FREE_MODE = (Deno.env.get('FREE_MODE') ?? 'false') === 'true';
export const FREE_DAILY_CAP = Number(Deno.env.get('FREE_DAILY_CAP') ?? '40');
export const FREE_PER_CLIENT = Number(Deno.env.get('FREE_PER_CLIENT') ?? '3');

/** 요청자 IP 를 그대로 저장하지 않고 하루 단위 해시로만 남긴다 */
export async function clientHash(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${day}|gwansang`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
