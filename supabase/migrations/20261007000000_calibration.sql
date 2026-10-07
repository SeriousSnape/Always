-- 보정용 측정값 수집 (docs/데이터-수집.md)
-- 받는 것: 얼굴 비율값(사진·좌표 아님), 성별, 연령대, 기기 임의 ID.
-- 브라우저(anon 키)는 표를 직접 읽거나 쓰지 못하고, submit_calibration 함수로만 넣는다.

create table if not exists public.calibration_samples (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  v smallint not null,
  device uuid not null,
  gender text not null default '' check (gender in ('', 'm', 'f')),
  age_band text not null default '' check (age_band in ('', '10대', '20대', '30대', '40대', '50대', '60대 이상')),
  forehead text not null default '' check (forehead in ('', 'visible', 'covered', 'unclear')),
  thirds real[] check (thirds is null or array_length(thirds, 1) = 3),
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object')
);

create index if not exists calibration_samples_device_time on public.calibration_samples (device, created_at);

alter table public.calibration_samples enable row level security;
-- 정책을 두지 않는다 = anon·authenticated 는 행을 읽거나 쓸 수 없다(서비스 키만 읽음)
revoke all on public.calibration_samples from anon, authenticated;

create or replace function public.submit_calibration(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  rec record;
  th real[];
begin
  if jsonb_typeof(p) <> 'object' then return '{"ok":false,"error":"json"}'; end if;
  if (p->>'v') is distinct from '2' then return '{"ok":false,"error":"version"}'; end if;
  if coalesce(p->>'device', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return '{"ok":false,"error":"device"}';
  end if;
  if jsonb_typeof(p->'metrics') <> 'object' then return '{"ok":false,"error":"metrics"}'; end if;
  if (select count(*) from jsonb_object_keys(p->'metrics')) > 100 then return '{"ok":false,"error":"metrics"}'; end if;
  for rec in select key, value from jsonb_each(p->'metrics') loop
    if rec.key !~ '^[A-Za-z0-9]{1,32}$' then return '{"ok":false,"error":"metric key"}'; end if;
    if jsonb_typeof(rec.value) = 'null' then continue; end if;
    if jsonb_typeof(rec.value) <> 'number' or (rec.value)::numeric not between -20 and 20 then
      return jsonb_build_object('ok', false, 'error', 'metric ' || rec.key);
    end if;
  end loop;
  if p ? 'thirds' and jsonb_typeof(p->'thirds') = 'array' then
    if jsonb_array_length(p->'thirds') <> 3 then return '{"ok":false,"error":"thirds"}'; end if;
    select array_agg(x::real) into th from jsonb_array_elements_text(p->'thirds') as x;
    if exists (select 1 from unnest(th) t where t < 0.05 or t > 0.9) then return '{"ok":false,"error":"thirds"}'; end if;
  end if;

  -- 같은 기기 6시간에 10번까지 (반복성 확인용으로 여러 번은 허용, 스팸은 막음)
  select count(*) into n from calibration_samples
   where device = (p->>'device')::uuid and created_at > now() - interval '6 hours';
  if n >= 10 then return '{"ok":false,"error":"limit"}'; end if;

  insert into calibration_samples (v, device, gender, age_band, forehead, thirds, metrics)
  values (2, (p->>'device')::uuid, coalesce(p->>'gender', ''), coalesce(p->>'ageBand', ''),
          coalesce(p->>'forehead', ''), th, p->'metrics');
  return '{"ok":true}';
exception
  when check_violation or invalid_text_representation then
    return '{"ok":false,"error":"value"}';
end;
$$;

revoke all on function public.submit_calibration(jsonb) from public;
grant execute on function public.submit_calibration(jsonb) to anon, authenticated;
