-- 무료 테스트 모드(결제 없이 해설 생성): 금액 0 허용, 남용 막기용 요청자 해시
alter table public.orders drop constraint if exists orders_amount_check;
alter table public.orders add constraint orders_amount_check check (amount >= 0);
alter table public.orders add column if not exists client_hash text;
create index if not exists orders_client_time on public.orders (client_hash, created_at);
