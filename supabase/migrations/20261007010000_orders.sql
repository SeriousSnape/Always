-- 유료 관상 주문·결과 (docs/결제-연결.md)
-- 저장: 주문 상태, 금액, 판정 재료(brief: 등급·원문, 사진·좌표·비율값 없음), 고민, 생성된 해설.
-- 저장 안 함: 사진, 얼굴 좌표, 비율값, 이름·연락처(영수증은 토스페이먼츠가 보낸다).
-- 브라우저는 표에 직접 접근하지 못한다(RLS, 정책 없음). Edge Function 이 서비스 키로만 읽고 쓴다.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- pending(결제 전) → paid(결제 승인) → done(해설 완료) / failed(생성 실패) / canceled
  status text not null default 'pending' check (status in ('pending', 'paid', 'done', 'failed', 'canceled')),
  amount int not null check (amount > 0),
  order_name text not null,
  -- 결과 링크 열쇠: 이 값을 아는 사람만 결과를 본다
  access_token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  brief jsonb not null,
  payment_key text,
  payment jsonb,
  paid_at timestamptz,
  generation_started_at timestamptz,
  generation_attempts int not null default 0,
  narrative jsonb,
  check_result jsonb,
  error text,
  expires_at timestamptz not null default now() + interval '1 year'
);

create index if not exists orders_status_created on public.orders (status, created_at);

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
