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
