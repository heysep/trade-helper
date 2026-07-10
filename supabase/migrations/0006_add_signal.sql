-- 데일리 점검: 추가매수 조건 충족 신호
alter table public.check_results
  add column add_signal boolean not null default false;
